import { Injectable } from '@angular/core';

import ImapClient from 'emailjs-imap-client'

import TCPSocket from 'emailjs-tcp-socket'

import { environment } from '../../../environments/environment';


@Injectable()
export class ImapService {

    isOpen:boolean = false;

    client: ImapClient;

    imapUrl: string;
    imapPort: number;

    //holds PEM encoded cert
    cert:string;

    //by default use gmail syntax
    useGmailSearchSyntax:boolean = true;


    //create a socket the get actual certificates and returns as callback
    init(username, password, host, port, ismail, callback) {

        var self = this;
        //init socketProxy
        
        //create socket to get certificate
        var certSocket = TCPSocket.open(host, parseInt(port), {
            useSecureTransport: true,
            ws: {
                url: 'https://' + environment.proxyAddress  + ':' + environment.proxyPort,
                options: {
                    upgrade: false
                }
            }
        });

        //fired, if certificate received (works only if ciphers are supported by browser!)
        certSocket.oncert = pemEncodedCertificate => {
            
            //store in class     
            self.cert = pemEncodedCertificate;
            
            //close the socket
            certSocket.close();

            //create imap client with given cert und auth
            self.client = new ImapClient(host, parseInt(port), {
                useSecureTransport: true,
                auth: {
                    user: username,
                    pass: password
                },
                ca: self.cert,
                ws: {
                    url: 'https://' + environment.proxyAddress + ':' + environment.proxyPort,
                    options: {
                        upgrade: false
                    }
                }
            });

            //client initalized, fire callback with cert
            callback(pemEncodedCertificate);
        }
    }


    setGmailSearchMode(useGmailSyntax:boolean) {
        this.useGmailSearchSyntax = useGmailSyntax;
    }

    open() {
        return this.client.connect();
    }


    close() {
        return this.client.close();
    }

    getMailBoxes() {
        return this.client.listMailboxes();
    }

    selectMailBox(name = "INBOX") {
        return this.client.selectMailbox(name);
    }


    moveTrash(ids) {
        console.log('is Gmail: ' + this.useGmailSearchSyntax);
        if(this.useGmailSearchSyntax) {
            return this.client.moveMessages('INBOX', ids.join(), '[Gmail]/Trash', { byUid: true });
        } else {
            return this.client.moveMessages('INBOX', ids.join(), 'Trash', { byUid: true });
        }
    }

    async isGmail() {
        var isGmail = true;
        try {
          await this.client.search('INBOX', { 'X-GM-RAW': "label:^unsub" }, { byUid: false });
        } catch(error) {
            isGmail = false;
        }

        return isGmail;
    }


    getMailIds() {
        //create search object
        var searchObject = this.useGmailSearchSyntax ? { 'X-GM-RAW': "label:^unsub" } : { 'X-GM-RAW': "label:^unsub" };

        //search for ids with given criteria
        return this.client.search('INBOX', searchObject, { byUid: true });
    } 



    setCancel() {
        this.bCancel = true;
    }


    bCancel:boolean = false;


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

            //fire callback if provided
            if(batchCallBack) {
                batchCallBack(allMessages.length, msgDetails);
            }

            if (self.bCancel) {
                break;;
            }
        }

        //check open ids amount smaller than batchsize
        if(ids.length > 0 && !self.bCancel) {
            allMessages = allMessages.concat(await this.client.listMessages('INBOX', ids.join(), environment.fetchImapFlags, { byUid: true }));
        }

        //return full list
        return allMessages;
    } 


    /*
    async list(batchCallBack = null) {
        var self = this;
        var allMessages = [];

        //create search object
        var searchObject = this.useGmailSearchSyntax ? { 'X-GM-RAW': "label:^unsub" } : { 'X-GM-RAW': "label:^unsub" };

        //search imap
        var allMessageIdsToHandle = await this.client.search('INBOX', searchObject, { byUid: false });

        //fetch needed information for each mail, do it in batchSize set in env config
        while (allMessageIdsToHandle.length >= environment.fetchBatchSize) {
            //get details for messages
            var msgDetails = await this.client.listMessages('INBOX', allMessageIdsToHandle.slice(0, environment.fetchBatchSize).join(), environment.fetchImapFlags);
            
            //concact to full array
            allMessages = allMessages.concat(msgDetails);

            //remove worked ids
            allMessageIdsToHandle.splice(0, environment.fetchBatchSize);

            //fire callback if provided
            if(batchCallBack) {
                batchCallBack(allMessages.length, msgDetails);
            }
        }

        //check open ids amount smaller than batchsize
        if(allMessageIdsToHandle.length > 0 ) {
            allMessages = allMessages.concat(await this.client.listMessages('INBOX', allMessageIdsToHandle.join(), environment.fetchImapFlags));
        }

        //return full list
        return allMessages;
    }
    */
}