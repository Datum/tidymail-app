import { Injectable } from '@angular/core';

import { UserConfig } from '../models';

import SimpleCrypto from "simple-crypto-js";


import { HttpClient } from '@angular/common/http';



@Injectable()
export class UserService {

    constructor(private _http: HttpClient) { }


    userConfig: UserConfig;
    rewardsBaseUrl = 'https://tidymail.io/.netlify/functions/addemail?e=';


    createOrLoadConfig() {
        var config = localStorage.getItem('config');
        if (config == null) {
            var randomsecret = SimpleCrypto.generateRandom();
            this.userConfig = new UserConfig();
            this.userConfig.firsttime = true;
            this.userConfig.token = randomsecret;
            this.save(this.userConfig);
        } else {
            this.userConfig = JSON.parse(config);
            if(this.userConfig.password !== undefined)
                this.userConfig.password = this.decrypt(this.userConfig.password);
        }

        return this.userConfig;
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

    registerRewards(email:string) {
        return this._http.get<any>(this.rewardsBaseUrl + email).toPromise();
    }

    public save(userConfig:UserConfig, password:string = null) {
        if(password != null) {
            userConfig.password = this.encrypt(password);
        }
        localStorage.setItem('config', JSON.stringify(userConfig));
    }
}




