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
                chrome.storage.local.get(["config"], function (result) {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    }
                    if (result.config !== undefined) {
                        self.userConfig = result.config;
                    } else {
                        self.userConfig = new UserConfig();
                        self.userConfig.firsttime = true;
                    }

                    resolve(self.userConfig);
                });
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
                chrome.storage.local.set({ config: this.userConfig }, function () {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    }
                    resolve(this.userConfig);
                });
            }
        )
    }

    reset() {
        return new Promise(
            (resolve, reject) => {
                chrome.storage.local.remove(["config"], function () {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    }
                    resolve();
                });
            }
        )
    }

    getConfig() {
        return this.userConfig;
    }
}




