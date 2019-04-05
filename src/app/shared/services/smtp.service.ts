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

import { LOG_LEVEL_NONE, LOG_LEVEL_ERROR, LOG_LEVEL_DEBUG } from 'emailjs-smtp-client'
import SmtpClient from 'emailjs-smtp-client'
import TCPSocket from 'emailjs-tcp-socket'
import { environment } from '../../../environments/environment';
import {
    mimeWordEncode, mimeWordDecode,
    mimeWordsEncode, mimeWordsDecode
} from 'emailjs-mime-codec'


@Injectable()
export class SmtpService {
    //cancel flag to stop work on long running processes    
    bCancel: boolean = false;

    //imap client 
    client: SmtpClient;


    create(username, password, host = "smtp.gmail.com", port = 465, trashBox = null) {
        var self = this;

        return new Promise<string>(
            (resolve, reject) => {
                //create socket to get certificate
                var certSocket = TCPSocket.open(host, port, {
                    useSecureTransport: true,
                    ws: {
                        url: environment.proxyUrl,
                        options: {
                            upgrade: false
                        }
                    }
                });

                certSocket.onerror = (error) => { 
                    if(error.data)
                        reject(error.data.message);
                    
                    reject(error); 
                } // A handler for the error event.


                //fired, if certificate received (works only if ciphers are supported by browser!)
                certSocket.oncert = pemEncodedCertificate => {

                    //close the socket
                    certSocket.close();

                    //create imap client with given cert und auth
                    self.client = new SmtpClient(host, port, {
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


    //open the imap client instance
    open() {
        var self = this;
        return new Promise<string>(
            (resolve, reject) => {
                self.client.onerror = function (error) {
                    console.log(error);
                    reject(error);
                };
                self.client.onidle = function() {
                    resolve();
                };
                self.client.connect();
            }
        );
    }


    //close the imap client instance
    close() {
        return this.client.close();
    }

    send(from: string, to: string, subject: string = "Unsubscribe", body: string = 'Please unsubscribe.') {

        var self = this;

        return new Promise<string>(
            (resolve, reject) => {
                self.client.useEnvelope({
                    from: from,
                    to: [to]
                });

                self.client.onready = function (failedRecipients) {
                    self.client.send("From: " + from + "\n");
                    self.client.send("To: " +  to + "\n");
                    self.client.send("Subject: " + subject + "\n" + body);
                    self.client.end();
                };

                self.client.ondone = function (success) {
                    success ? resolve() : reject();
                };
                self.client.onerror = function (error) {
                    reject(error);
                };
            }
        );

    }
}