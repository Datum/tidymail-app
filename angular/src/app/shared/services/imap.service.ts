import { Injectable } from '@angular/core';
import ImapClient from 'emailjs-imap-client'
import TCPSocket from 'emailjs-tcp-socket'
import { environment } from '../../../environments/environment';


@Injectable()
export class ImapService {

    //cancel flag to stop work on long running processes    
    bCancel:boolean = false;

    //imap client 
    client: ImapClient;

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
                url: (environment.proxyUseHttps ? 'https' : 'http') + '://' + environment.proxyAddress  + ':' + environment.proxyPort,
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
                    url: (environment.proxyUseHttps ? 'https' : 'http') + '://' + environment.proxyAddress + ':' + environment.proxyPort,
                    options: {
                        upgrade: false
                    }
                }
            });

            //client initalized, fire callback with cert
            callback(pemEncodedCertificate);
        }
    }

    //enable/disbable gmail specified behavior
    setGmailSearchMode(useGmailSyntax:boolean) {
        this.useGmailSearchSyntax = useGmailSyntax;
    }

    //open the imap client instance
    open() {
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
        if(this.useGmailSearchSyntax) {
            return this.client.moveMessages('INBOX', ids.join(), '[Gmail]/Trash', { byUid: true });
        } else {
            return this.client.moveMessages('INBOX', ids.join(), 'Trash', { byUid: true });
        }
    }

    //check if current imap instance is gmail instance and support gmail search syntax
    async isGmail() {
        var isGmail = true;
        try {
          await this.client.search('INBOX', { 'X-GM-RAW': "label:^unsub" }, { byUid: false });
        } catch(error) {
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

            //fire callback if provided
            if(batchCallBack) {
                batchCallBack(allMessages.length, msgDetails);
            }

            //break if cancel requested
            if (self.bCancel) {
                break;
            }
        }

        //check open ids amount smaller than batchsize
        if(ids.length > 0 && !self.bCancel) {
            allMessages = allMessages.concat(await this.client.listMessages('INBOX', ids.join(), environment.fetchImapFlags, { byUid: true }));
        }

        //return full list
        return allMessages;
    } 
}