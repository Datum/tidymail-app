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
import { LOG_LEVEL_NONE, LOG_LEVEL_ERROR, LOG_LEVEL_DEBUG } from 'emailjs-imap-client'
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
    useGmailSearchSyntax: boolean = false;
    trashBoxPath: string;
    sentBoxPath: string;
    username:string;


    create(username, password, host = "imap.gmail.com", port = 993, trashBox = null, sentBox = null) {
        var self = this;

        if (trashBox == null) {
            trashBox = "Trash";
        }

        if (sentBox == null) {
            sentBox = "Sent";
        }

        this.trashBoxPath = trashBox;
        this.sentBoxPath = sentBox;
        this.username = username;

        this.useGmailSearchSyntax = (host == "imap.gmail.com");

        return new Promise<string>(
            (resolve, reject) => {
                //create socket to get certificate
                var certSocket = TCPSocket.open(host, port, {
                    useSecureTransport: true,
                    ws: {
                        url: environment.proxyUrl,
                        options: {
                            upgrade: false,
                            reconnection: true
                        }
                    }
                });

                certSocket.onerror = (error) => { reject(error) } // A handler for the error event.

                //fired, if certificate received (works only if ciphers are supported by browser!)
                certSocket.oncert = pemEncodedCertificate => {
                    //close the socket
                    certSocket.close();

                    //create imap client with given cert und auth
                    self.client = new ImapClient(host, port, {
                        logLevel: environment.production ? LOG_LEVEL_ERROR : LOG_LEVEL_DEBUG,
                        useSecureTransport: true,
                        auth: {
                            user: username,
                            pass: password
                        },
                        ca: pemEncodedCertificate,
                        ws: {
                            url: environment.proxyUrl,
                            options: {
                                upgrade: false,
                                reconnection: true
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
        var self = this;
        this.client.onerror = function (error) {
            console.log('imap client error. auto reconnect....');
            console.log(error);
            self.client.connect();
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
    moveTrash(ids, sourcePath = 'INBOX') {
        return this.client.moveMessages(sourcePath, ids.join(), this.trashBoxPath, { byUid: true });
    }

    send() {
        return this.client.upload('inbox', 'MIME-Version: 1.0\r\nDate: Wed, 9 Jul 2014 15:07:47 +0200\r\nDelivered-To: test@test.com\r\nMessage-ID: <CAHftYYQo=5fqbtnv-DazXhL2j5AxVP1nWarjkztn-N9SV91Z2w@mail.gmail.com>\r\nSubject: test\r\nFrom: Test Test <test@test.com>\r\nTo: Test Test <test@test.com>\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\ntest', {
            flags: ['\\Seen', '\\Answered', '\\$MyFlag']
        })
    }

    //check if current imap instance is gmail instance and support gmail search syntax
    async isGmail() {
        var isGmail = true;
        try {
            await this.client.search('INBOX', { 'X-GM-RAW': "label:^anythingThatNotExistsToCheckSearchFeature" }, { byUid: false });
        } catch (error) {
            isGmail = false;
        }
        return isGmail;
    }


    deleteSentMails(to) {
        var self = this;
        //search for ids with given criteria
        return this.client.search(this.sentBoxPath, { 'TO': to }, { byUid: true }).then(function(mails) {
            return self.moveTrash(mails, self.sentBoxPath);
        });
    }

    //get relavant mail based on searchCommand;
    getMailIds(lastUid: number, forceImapMode = false) {
        //create search object
        let searchObject = this.useGmailSearchSyntax ?
            environment.gmailSearchQuery
            :
            environment.defaultSearchQuery;


        //if gmail do two searches, one with all that have "unsubscribe header" other that gmails labels as "unsub" what means there should be link in body
        //force imap for moment
        if (forceImapMode) {
            searchObject = environment.defaultSearchQuery;
        }

        searchObject = JSON.parse(JSON.stringify(searchObject));


        //ugly hack, if yahoo, remove header search because error would occur
        if(this.username.indexOf('yahoo.com') != -1) {
            delete searchObject['HEADER'];
        }

        //add "since" or "after" filter to search
        if (lastUid !== undefined) {
            //if uid smaller than 1, set to 1
            if (lastUid < 1) lastUid = 1;
            searchObject['UID'] = lastUid.toString() + ":*";
        }

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
        var worked = [];

        //fetch needed information for each mail, do it in batchSize set in env config
        while (ids.length >= environment.fetchBatchSize) {
            //get details for messages
            var msgDetails = await this.client.listMessages('INBOX', ids.slice(0, environment.fetchBatchSize).join(), environment.fetchImapFlags, { byUid: true });

            //concact to full array
            allMessages = allMessages.concat(msgDetails);

            //remove worked ids
            ids.splice(0, environment.fetchBatchSize);

            //fire callback if provided
            if (batchCallBack) {
                await batchCallBack(allMessages.length, ids.length, msgDetails, self.bCancel);
            }

            //break if cancel requested
            if (self.bCancel) {
                break;
            }
        }

        //check open ids amount smaller than batchsize
        if (ids.length > 0 && !self.bCancel) {
            var msgDetails = await this.client.listMessages('INBOX', ids.join(), environment.fetchImapFlags, { byUid: true });
            allMessages = allMessages.concat(msgDetails);

            //fire callback if provided
            if (batchCallBack) {
                await batchCallBack(allMessages.length, ids.length, msgDetails, self.bCancel);
            }
        }

        //set cancel back
        self.bCancel = false;

        //return full list
        return allMessages;
    }
}