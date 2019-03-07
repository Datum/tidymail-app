import { ChangeDetectorRef, Component, Inject, AfterViewInit } from '@angular/core';

import { TAB_ID } from './tab-id.injector';


import { DataService } from './shared';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
// tslint:disable:variable-name
export class AppComponent implements AfterViewInit {
    readonly tabId = this._tabId;
    message: string;
    isLoggedIn: boolean = false;
    newCount = 0;

    ngAfterViewInit() {
        this.loadToken();
    }


    messages = [];

    constructor(
        @Inject(TAB_ID) private _tabId: number,
        private _changeDetector: ChangeDetectorRef,
        private _dataService: DataService) { }


    login() {

        var authUrl = "https://accounts.google.com/o/oauth2/auth"
            + '?response_type=token&client_id=' + "187423944392-87r99e4mn2bdhr1q7e3gjg2v5hohp08a.apps.googleusercontent.com"
            + '&scope=' + "https://www.googleapis.com/auth/gmail.readonly"
            + '&redirect_uri=' + chrome.identity.getRedirectURL("oauth2");

        var self = this;

        chrome.identity.launchWebAuthFlow({ 'url': authUrl, 'interactive': true }, function (redirectUrl) {
            if (redirectUrl) {
                var parsed = parse(redirectUrl.substr(chrome.identity.getRedirectURL("oauth2").length + 1));
                self._dataService.setAccessToken(parsed.access_token);
                self.storeToken(parsed.access_token);
                self.isLoggedIn = true;
                self.getMessages();
            } else {
                alert("launchWebAuthFlow login failed. Is your redirect URL (" + chrome.identity.getRedirectURL("oauth2") + ") configured with your OAuth2 provider?");
            }
        });
    }

    getMessages() {
        this._dataService.getMessages()
            .subscribe(resp => {
                this.messages = resp.messages;
                this.tabs[0].count = resp.messages.length;
                this._changeDetector.detectChanges();
            });
    }

    storeToken(accessToken: string) {
        chrome.storage.local.set({ token: accessToken }, function () {

        });
    }

    loadToken() {
        var self = this;
        chrome.storage.local.get(["token"], function (result) {
            if (result.token !== undefined) {
                self._dataService.setAccessToken(result.token);
                self.isLoggedIn = true;
                self.getMessages();
            }
        });
    }

    search() {


        //https://www.googleapis.com/gmail/v1/users/me/messages?access_token=ya29.GlzFBhvswgB65HeAoeiBnoIz9nwc6aAPI8FAzu_D60gCpL6W5f363pAjFWXWonlpxBpaGXnAi0eDyIEUwNy4NmR-m-huORIz1p-UPaPIQo85ORUGC91E0JV_WULm8Q


        /*
        {
 "messages": [
  {
   "id": "16959b5933aaf138",
   "threadId": "16959b5933aaf138"
  },
  */



    }

    onClick(): void {
        chrome.tabs.sendMessage(this._tabId, 'request', message => {
            this.message = message;
            this._changeDetector.detectChanges();
        });
    }

    tabs = [
        { label: 'New', icon: 'info', count: 1 },
        { label: 'Unsubscribed', icon: 'email', count: 10 }
    ];

    mails = [
        { title: 'Test-Title', description: 'blah aldhsflhajsdhfasd ', icon: 'https://s2.googleusercontent.com/s2/favicons?domain=Atlassian.net' }
    ]
}


function parse(str) {
    if (typeof str !== 'string') {
        return {};
    }
    str = str.trim().replace(/^(\?|#|&)/, '');
    if (!str) {
        return {};
    }
    return str.split('&').reduce(function (ret, param) {
        var parts = param.replace(/\+/g, ' ').split('=');
        // Firefox (pre 40) decodes `%3D` to `=`
        // https://github.com/sindresorhus/query-string/pull/37
        var key = parts.shift();
        var val = parts.length > 0 ? parts.join('=') : undefined;
        key = decodeURIComponent(key);
        // missing `=` should be `null`:
        // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
        val = val === undefined ? null : decodeURIComponent(val);
        if (!ret.hasOwnProperty(key)) {
            ret[key] = val;
        }
        else if (Array.isArray(ret[key])) {
            ret[key].push(val);
        }
        else {
            ret[key] = [ret[key], val];
        }
        return ret;
    }, {});
}
