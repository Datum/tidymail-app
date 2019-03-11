import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Message, MessageList, Profile, MessageGroup } from '../models';

import { map } from 'rxjs/operators'
import { BehaviorSubject, Observable } from 'rxjs';
import { MdcHeadline1 } from '@angular-mdc/web';
import Dexie from 'dexie';

@Injectable()
export class DataService {


    private _messages: Message[] = [];
    private _observableMessageList: BehaviorSubject<Message[]> = new BehaviorSubject([]);

    private _messagesGroup: MessageGroup[] = [];
    private _observableMessagesGroupList: BehaviorSubject<MessageGroup[]> = new BehaviorSubject([]);


    private _logMessage: string;
    private _observableLogMessage: BehaviorSubject<string> = new BehaviorSubject("");

    get messagesList(): Observable<Message[]> { return this._observableMessageList.asObservable() }

    get messagesGroupList(): Observable<MessageGroup[]> { return this._observableMessagesGroupList.asObservable() }

    get logMessage(): Observable<string> { return this._observableLogMessage.asObservable() }

    baseUrl: string = "https://www.googleapis.com/gmail/v1/users/me";

    totalMailAmount: number = 0;

    authUrl: string = "https://accounts.google.com/o/oauth2/auth"
        + '?response_type=token&client_id=' + "187423944392-87r99e4mn2bdhr1q7e3gjg2v5hohp08a.apps.googleusercontent.com"
        + '&scope=' + "https://www.googleapis.com/auth/gmail.readonly"
        + '&redirect_uri=' + chrome.identity.getRedirectURL("oauth2");

    accessToken: string;


    constructor(
        private http: HttpClient,
    ) {
        //load actual token
        var self = this;
        chrome.storage.local.get(["token"], function (result) {
            self.accessToken = result.token;
        });

        this.createDatabase();
    }

    setAccessToken(token: string, callback: Function) {
        var self = this;
        chrome.storage.local.set({ token: token }, function () {
            self.accessToken = token;
            callback();
        });
    }

    login(callback) {
        var self = this;
        chrome.identity.launchWebAuthFlow({ 'url': this.authUrl, 'interactive': true }, function (redirectUrl) {
            if (redirectUrl) {
                var parsed = parse(redirectUrl.substr(chrome.identity.getRedirectURL("oauth2").length + 1));
                self.setAccessToken(parsed.access_token, callback);
            } else {
                alert("launchWebAuthFlow login failed. Is your redirect URL (" + chrome.identity.getRedirectURL("oauth2") + ") configured with your OAuth2 provider?");
            }
        });
    }



    snyc(callback): any {
        var self = this;
        //get mail list for count only and return back in callback
        this.http.get<MessageList>(this.baseUrl + "/messages?access_token=" + this.accessToken + "&q=tester").subscribe(function (result) {
            this.totalMailAmount = result.resultSizeEstimate;
            callback(result.resultSizeEstimate);
            if (result.resultSizeEstimate > 0) {
                self.loadMessageIds(null);
            }
        });
    }


    cancelProcess() {
        this.bCancel = true;
    }

    private bCancel:boolean = false;

    loadMessageIds(nextPageToken) {
        var self = this;

        var url = this.baseUrl + "/messages?access_token=" + this.accessToken + "&q=list:";
        if (nextPageToken) {
            url += "&pageToken=" + nextPageToken;
        }

        this.http.get<MessageList>(url).subscribe(function (result) {
            self._messages = self._messages.concat(result.messages);
            self._observableMessageList.next(self._messages);


            if (result.nextPageToken) {
                self.loadMessageIds(result.nextPageToken);
            } else {
                //finished fetching id's, group them
                self.getMessageBody();
            }
        });
    }

    async getMessageBody() {

        //try to get in batch of 25 requests

        for (var index = 0; index < this._messages.length; index++) {
            if(this.bCancel) {
                this.bCancel = false;
                break;
            }
            let mailExists = await this.db.mails.get(this._messages[index].id);
            if (mailExists === undefined) {

                var msg = await this.http.get<any>(this.baseUrl + "/messages/" + this._messages[index].id + "?access_token=" + this.accessToken).toPromise();
                for (var a = 0; a < msg.payload.headers.length; a++) {
                    if (msg.payload.headers[a].name == "Subject") {
                        this._messages[index].subject = msg.payload.headers[a].value;
                    }

                    if (msg.payload.headers[a].name == "From") {
                        this._messages[index].from = msg.payload.headers[a].value;
                    }

                    if (msg.payload.headers[a].name == "List-Unsubscribe") {
                        this._messages[index].unsubscribeUrl = msg.payload.headers[a].value;
                    }
                }

                this._observableLogMessage.next(index.toString());

                await this.db.mails.add(this._messages[index]);
            }
        }


        var group = {};
        var self = this;
        this._messagesGroup = [];


        const allItems: Message[] = await this.db.mails.toArray();

        allItems.forEach((item: Message) => {
            group[item.from] = group[item.from] || [];
            group[item.from].push(a);
        });

        //create list with all grouped
        for (var key in group) {
            var mg = new MessageGroup();
            mg.name = key;
            mg.messages = group[key];
            mg.hostname = extractHostname(key);
            this._messagesGroup.push(mg);
        }

        this._observableMessagesGroupList.next(this._messagesGroup);

    }


    private db: any;

    private createDatabase() {
        this.db = new Dexie('DatumUnsubscriberDatabase');
        this.db.version(1).stores({
            mails: 'id,from,subject,threadId,unread,unsubscribeUrl,internalDate'
        });
    }

    getConfig() {
        //return this.http.get(this.configUrl);
    }


    /*
    getMessages(nextPageToken:number = null, result:Message[] = null) {
       return this.http.get<MessageList>(this.baseUrl + "/messages?access_token=" + this.accessToken + "&q=list:").subscribe(function(result) {

       });
    }
    */

    getProfile() {
        return this.http.get<Profile>(this.baseUrl + "/profile?access_token=" + this.accessToken);
    }

    getMessage(id: string) {
        return this.http.get(this.baseUrl + "/messages/" + id + "?access_token=" + this.accessToken)
            .pipe(map((message) => {
                return new Message();
            }));
    }

    private extractData(res: Response) {
        return res.json() || {};
    }
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



function extractHostname(url) {

    var iStart = url.lastIndexOf('<');
    var iEnd = url.lastIndexOf('>');

    if (iStart > -1 && iEnd > -1) {
        var mail = url.substr(iStart + 1, iEnd - iStart - 1);
        var at = mail.lastIndexOf('@');
        if (at != -1) {
            return mail.substr(at + 1);
        }
        return mail;
    }

    return url;
}