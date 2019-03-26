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
                    self.userConfig.secret = randomsecret;
                } else {
                    self.userConfig = JSON.parse(config);
                }
                resolve(self.userConfig);
            }
        )
    }


    encrypt(str: string) {
        var simpleCrypto = new SimpleCrypto(this.userConfig.secret);
        return simpleCrypto.encrypt(str).toString();
    }

    decrypt(enc: string) {
        var simpleCrypto = new SimpleCrypto(this.userConfig.secret);
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
        this.userConfig.password = password;
        this.userConfig.isGmailProvider = isGmailProvider;
        this.userConfig.firsttime = false;

        return new Promise<UserConfig>(
            (resolve, reject) => {
                localStorage.setItem('config', JSON.stringify(this.userConfig));
                resolve(this.userConfig);
            }
        )

    }

    storeAccessTokens(tokenResult) {
        this.userConfig.access_token = this.encrypt(tokenResult.access_token);
        if (tokenResult.refresh_token !== undefined) {
            this.userConfig.refresh_token = this.encrypt(tokenResult.refresh_token);
        }
        this.userConfig.expires = Math.round(new Date().getTime() / 1000) + tokenResult.expires_in;
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




