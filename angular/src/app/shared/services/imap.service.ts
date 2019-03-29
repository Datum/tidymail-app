/*
    TidyMail App
    Copyright (C) 2019  Datum Network GmbH

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Injectable } from '@angular/core';
import ImapClient from 'emailjs-imap-client'
import TCPSocket from 'emailjs-tcp-socket'
import { environment } from '../../../environments/environment';
import {
    mimeWordEncode, mimeWordDecode,
    mimeWordsEncode, mimeWordsDecode
} from 'emailjs-mime-codec'


@Injectable()
export class ImapService {

    //cancel flag to stop work on long running processes    
    bCancel: boolean = false;

    //imap client 
    client: ImapClient;

    //by default use gmail syntax
    useGmailSearchSyntax: boolean = true;



    init(username, password, host, port) {
        var self = this;

        return new Promise<string>(
            (resolve, reject) => {
                //create socket to get certificate
                var certSocket = TCPSocket.open(host, parseInt(port), {
                    useSecureTransport: true,
                    ws: {
                        url: environment.proxyUrl,
                        options: {
                            upgrade: false
                        }
                    }
                });


                //fired, if certificate received (works only if ciphers are supported by browser!)
                certSocket.oncert = pemEncodedCertificate => {

                    //close the socket
                    certSocket.close();

                    //create imap client with given cert und auth
                    self.client = new ImapClient(host, parseInt(port), {
                        useSecureTransport: true,
                        auth: {
                            user: username,
                            pass: password
                        },
                        ca: pemEncodedCertificate,
                        ws: {
                            url: environment.proxyUrl,
                            options: {
                                upgrade: false
                            }
                        }
                    });

                    //client initalized, fire callback with cert
                    resolve(pemEncodedCertificate);
                }
            }
        )
    }

    //enable/disbable gmail specified behavior
    setGmailSearchMode(useGmailSyntax: boolean) {
        this.useGmailSearchSyntax = useGmailSyntax;
    }

    //open the imap client instance
    open() {
        this.client.onerror = function (error) {
            console.log('imap client error');
            console.log(error);
            throw new Error(error);
        };
        return this.client.connect();
    }


    //close the imap client instance
    close() {
        return this.client.close();
    }

    //get all aviaible mailboxes
    getMailBoxes() {
        return this.client.listMailboxes();
    }

    //select mailbox to get summary information
    selectMailBox(name = "INBOX") {
        return this.client.selectMailbox(name);
    }


    //move given mail id to trash
    moveTrash(ids) {
        if (this.useGmailSearchSyntax) {
            return this.client.moveMessages('INBOX', ids.join(), '[Gmail]/Trash', { byUid: true });
        } else {
            return this.client.moveMessages('INBOX', ids.join(), 'Trash', { byUid: true });
        }
    }

    //check if current imap instance is gmail instance and support gmail search syntax
    async isGmail() {
        var isGmail = true;
        try {
            await this.client.search('INBOX', { 'X-GM-RAW': "label:^anythingThatNotExists" }, { byUid: false });
        } catch (error) {
            isGmail = false;
        }
        return isGmail;
    }

    //get relavant mail based on searchCommand;
    getMailIds() {
        //create search object
        var searchObject = this.useGmailSearchSyntax ?
            environment.gmailSearchQuery
            :
            environment.defaultSearchQuery;

        //search for ids with given criteria
        return this.client.search('INBOX', searchObject, { byUid: true });
    }


    async getMailWithSameFrom(from: string) {
        //trim all whitespace
        from = from.trim();

        //check if mail only or with name
        if (from.indexOf(' ') != -1) {
            var fromName = "";
            var fromMail = "";

            var iStart = from.indexOf('<');
            if (iStart != -1) {
                fromName = from.substr(0, iStart).split("\"").join("").trim();
                fromMail = from.substr(iStart);
            }

            var searchObject = this.useGmailSearchSyntax ?
                { 'X-GM-RAW': "from:" + '"' + fromName + '" ' + fromMail }
                :
                { 'HEADER': ['from', '"' + fromName + '" ' + fromMail] };


            return await this.client.search('INBOX', searchObject, { byUid: true });

        } else {

            var searchObject = this.useGmailSearchSyntax ?
                { 'X-GM-RAW': "from:" + from }
                :
                { 'HEADER': ['from', from] };

            return await this.client.search('INBOX', searchObject, { byUid: true });
        }
    }


    //set cancel request
    setCancel() {
        this.bCancel = true;
    }

    //read requested fields for all mail, optional callback method can be provided, to is called after every batch with length and msd details
    async getMailContent(ids, batchCallBack) {
        var self = this;
        var allMessages = [];

        //fetch needed information for each mail, do it in batchSize set in env config
        while (ids.length >= environment.fetchBatchSize) {
            //get details for messages
            var msgDetails = await this.client.listMessages('INBOX', ids.slice(0, environment.fetchBatchSize).join(), environment.fetchImapFlags, { byUid: true });

            //concact to full array
            allMessages = allMessages.concat(msgDetails);

            //remove worked ids
            ids.splice(0, environment.fetchBatchSize);

            var worked = [];

            //loop to get from and remove ids from list
            for (var i = 0; i < msgDetails.length; i++) {
                var from = mimeWordsDecode(msgDetails[i]['body[header.fields (from)]'].substr(6));
                from = from.replace(/"/g, '');

                if (worked.indexOf(from) == -1) {

                    var sameFromIds = await this.getMailWithSameFrom(from);
                    msgDetails[i].sameFromIds = sameFromIds;

                    console.log('work ids before exlude: ' + ids.length);

                    ids = ids.filter(function (el) {
                        return !sameFromIds.includes(el);
                    });

                    console.log('work ids after exlude: ' + ids.length);

                    worked.push(from);
                }

                //break if cancel requested
                if (self.bCancel) {
                    break;
                }
            }

            //fire callback if provided
            if (batchCallBack) {
                batchCallBack(allMessages.length, ids.length, msgDetails);
            }

            //break if cancel requested
            if (self.bCancel) {
                break;
            }
        }

        //check open ids amount smaller than batchsize
        if (ids.length > 0 && !self.bCancel) {
            allMessages = allMessages.concat(await this.client.listMessages('INBOX', ids.join(), environment.fetchImapFlags, { byUid: true }));
        }

        //return full list
        return allMessages;
    }
}