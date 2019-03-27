import { Injectable } from '@angular/core';

import { UserConfig } from '../models';

import SimpleCrypto from "simple-crypto-js";



@Injectable()
export class UserService {

    constructor() { }


    userConfig: UserConfig;


    initConfig() {
        var self = this;
        return new Promise<UserConfig>(
            (resolve, reject) => {
                var config = localStorage.getItem('config');
                if (config == null) {

                    var randomsecret = SimpleCrypto.generateRandom();

                    self.userConfig = new UserConfig();
                    self.userConfig.firsttime = true;
                    self.userConfig.token = randomsecret;
                } else {
                    self.userConfig = JSON.parse(config);
                    self.userConfig.password = self.decrypt(self.userConfig.password);
                }
                resolve(self.userConfig);
            }
        )
    }


    encrypt(str: string) {
        var simpleCrypto = new SimpleCrypto(this.userConfig.token);
        return simpleCrypto.encrypt(str).toString();
    }

    decrypt(enc: string) {
        var simpleCrypto = new SimpleCrypto(this.userConfig.token);
        return simpleCrypto.decrypt(enc).toString();
    }


    storeLastRun(lastUid) {
        this.userConfig.lastUidProcessed = lastUid;
        localStorage.setItem('config', JSON.stringify(this.userConfig));
    }

    storeImapSettings(host, port, username, password, isGmailProvider) {
        this.userConfig.imapurl = host;
        this.userConfig.imapport = parseInt(port);
        this.userConfig.username = username;
        this.userConfig.password = this.encrypt(password);
        this.userConfig.isGmailProvider = isGmailProvider;
        this.userConfig.firsttime = false;

        return new Promise<UserConfig>(
            (resolve, reject) => {
                localStorage.setItem('config', JSON.stringify(this.userConfig));
                resolve(this.userConfig);
            }
        )

    }


    reset() {
        return new Promise(
            (resolve, reject) => {
                localStorage.removeItem('config');
                resolve();
            }
        )
    }

    getConfig() {
        return this.userConfig;
    }
}




