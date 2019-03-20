import { Injectable } from '@angular/core';

import { UserConfig } from '../models';



@Injectable()
export class UserService {

    constructor() { }


    userConfig: UserConfig;


    initConfig() {
        var self = this;
        return new Promise<UserConfig>(
            (resolve, reject) => {
                var config = localStorage.getItem('config');
                if(config == null) {
                    self.userConfig = new UserConfig();
                    self.userConfig.firsttime = true;
                } else {
                    self.userConfig = JSON.parse(config);
                }
                resolve(self.userConfig);
            }
        )
    }


    storeAccessTokens(tokenResult) {
        this.userConfig.access_token = tokenResult.access_token;
        if(tokenResult.refresh_token !== undefined) {
            this.userConfig.refresh_token = tokenResult.refresh_token;
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




