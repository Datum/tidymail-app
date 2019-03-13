import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Message, MessageList, Profile, MessageGroup, DisplayGroup, UserConfig } from '../models';

import { map } from 'rxjs/operators'
import { BehaviorSubject, Observable } from 'rxjs';
import { MdcHeadline1 } from '@angular-mdc/web';
import Dexie from 'dexie';
import { typeWithParameters } from '@angular/compiler/src/render3/util';

@Injectable()
export class DataService {


    private _messages: Message[] = [];
    private _observableMessageList: BehaviorSubject<Message[]> = new BehaviorSubject([]);

    private _messagesGroup: MessageGroup[] = [];
    private _observableMessagesGroupList: BehaviorSubject<MessageGroup[]> = new BehaviorSubject([]);

    private _displayGroup: DisplayGroup[] = [];
    private _observableDisplayGroupList: BehaviorSubject<DisplayGroup[]> = new BehaviorSubject([]);


    private _logMessage: string;
    private _observableLogMessage: BehaviorSubject<string> = new BehaviorSubject("");

    get messagesList(): Observable<Message[]> { return this._observableMessageList.asObservable() }

    get messagesGroupList(): Observable<MessageGroup[]> { return this._observableMessagesGroupList.asObservable() }

    get messagesDisplayList(): Observable<DisplayGroup[]> { return this._observableDisplayGroupList.asObservable() }

    get logMessage(): Observable<string> { return this._observableLogMessage.asObservable() }


    baseUrl: string = "https://www.googleapis.com/gmail/v1/users/me";
    tokenUrl:string = 'https://www.googleapis.com/oauth2/v4/token';
    clientid: string = "187423944392-87r99e4mn2bdhr1q7e3gjg2v5hohp08a.apps.googleusercontent.com";
    clientsecret:string = "26OcvwqMmwMe6wF8uOFGPBj0";
    userconfig:UserConfig;

    totalMailAmount: number = 0;

    authUrl: string = "https://accounts.google.com/o/oauth2/auth"
        + '?response_type=code&access_type=offline&approval_prompt=force&client_id=' + this.clientid
        + '&scope=' + "https://www.googleapis.com/auth/gmail.readonly"
        + '&redirect_uri=' + chrome.identity.getRedirectURL("oauth2");



    constructor(
        private http: HttpClient,
    ) {
    }

    setAccessToken(token: string, refresh_token:string, expires:number, callback: Function) {
        this.userconfig.access_token = token;
        this.userconfig.refresh_token = refresh_token;
        this.userconfig.expires = Math.round(new Date().getTime() / 1000) + expires;
        this.userconfig.firsttime = false;
        chrome.storage.local.set({ config: this.userconfig }, function () {
            callback();
        });
    }

    login(callback) {
        var self = this;
        chrome.identity.launchWebAuthFlow({ 'url': this.authUrl, 'interactive': true }, function (redirectUrl) {
            if (redirectUrl) {

                var parsed = parse(redirectUrl.substr(chrome.identity.getRedirectURL("oauth2").length + 1));
                //get tokens from code
                self.getToken(parsed.code, self.clientid, callback).subscribe(function(result) {
                    //store tokens and run callback
                    self.setAccessToken(result.access_token, result.refresh_token, result.expires_in, callback);
                });
            } else {
                alert("launchWebAuthFlow login failed. Is your redirect URL (" + chrome.identity.getRedirectURL("oauth2") + ") configured with your OAuth2 provider?");
            }
        });
        
    }


    refreshToken(refresh_token) {
        /*
            client_id: <YOUR_CLIENT_ID>
            client_secret: <YOUR_CLIENT_SECRET>
            refresh_token: <REFRESH_TOKEN_FOR_THE_USER>
            grant_type: refresh_token
        */
       return this.http.post<any>(this.tokenUrl, { client_id: this.clientid, client_secret: this.clientsecret, refresh_token: refresh_token, grant_type: "refresh_token"});
    }

    getToken(code, client_id,  callback) {
        /*

                {
        "access_token": "ya29.GluCBcWz5DTsbBTAGvNV2m0eJXSn4rBpXq7wNKw8Ryqp52JAckB9iBvvTnrUIzTSiDv1oQE6NTrDytoYYEhCngBPwyyhhfJJXYBj574rZ5MwnIXZhUbcWrkF8PtD",
        "token_type": "Bearer",
        "expires_in": 3600,
        "refresh_token": "1/qK6SZ1UoFciRvVdY6B7u0oZRXiIOvMdhaaB1myjEoV8"
        }

        */
        return this.http.post<any>(this.tokenUrl, { code: code, client_id: client_id, client_secret: this.clientsecret, grant_type: "authorization_code", redirect_uri: chrome.identity.getRedirectURL("oauth2") });
    }



    snyc(callback): any {
        var self = this;
        //get mail list for count only and return back in callback
        this.http.get<MessageList>(this.baseUrl + "/messages?access_token=" + this.userconfig.access_token + "&q=list:").subscribe(function (result) {
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

        var url = this.baseUrl + "/messages?access_token=" + this.userconfig.access_token + "&q=list:";
        if (nextPageToken) {
            url += "&pageToken=" + nextPageToken;
        }

        this.http.get<MessageList>(url).subscribe(async function (result) {
            self._messages = self._messages.concat(result.messages);
            self._observableMessageList.next(self._messages);

            
            //let mailExists = await self.db.mails.get(result.messages[0].id);
            if (result.nextPageToken && !self.bCancel /*&& mailExists === undefined*/) {
                self.loadMessageIds(result.nextPageToken);
            } else {
                //finished fetching id's, group them
                self.bCancel = false;
                self.getMessageBody();
            }
        });
    }

    async getMessageBody() {

        //try to get in batch of 25 requests

        for (var index = 0; index < this._messages.length; index++) {

            this._observableLogMessage.next(index.toString());

            if(this.bCancel) {
                this.bCancel = false;
                break;
            }


            let mailExists = await this.db.mails.get(this._messages[index].id);
            if (mailExists === undefined) {

                var msg = await this.http.get<any>(this.baseUrl + "/messages/" + this._messages[index].id + "?access_token=" + this.userconfig.access_token).toPromise();
                for (var a = 0; a < msg.payload.headers.length; a++) {
                    if (msg.payload.headers[a].name == "Subject") {
                        this._messages[index].subject = msg.payload.headers[a].value;
                    }

                    if (msg.payload.headers[a].name == "From") {
                        this._messages[index].from = msg.payload.headers[a].value;
                        this._messages[index].hostname = extractHostname(msg.payload.headers[a].value);
                        
                    }

                    if (msg.payload.headers[a].name == "List-Unsubscribe") {
                        this._messages[index].unsubscribeUrl = msg.payload.headers[a].value;
                    }
                }

                this._messages[index].internalDate = msg.internalDate;
                this._messages[index].status = 0;
                this._messages[index].unread = (msg.labelIds.indexOf("UNREAD") > -1)

                //this._observableLogMessage.next(index.toString());

                await this.db.mails.add(this._messages[index]);
            }
        }


        var group = {};
        var self = this;
        this._messagesGroup = [];


        const allItems: Message[] = await this.db.mails.toArray();

        allItems.forEach((item: Message) => {
            group[item.from] = group[item.from] || [];
            group[item.from].push(item);
        });

        //create list with all grouped
        for (var key in group) {
            var mg = new MessageGroup();
            mg.name = key;
            mg.messages = group[key];
            mg.hostname = extractHostname(key);
            mg.subject = group[key][0].subject;
            this._messagesGroup.push(mg);
        }

        group = {};
        this._messagesGroup.forEach((item: MessageGroup) => {
            var firstDomainChar = item.hostname.substring(0,1).toLocaleLowerCase();
            group[firstDomainChar] = group[firstDomainChar] || [];
            group[firstDomainChar].push(item);
        });

          //create list with all grouped
        for (var key in group) {
            var dg = new DisplayGroup();
            dg.name = key.toUpperCase();
            dg.messagegroups = group[key];
            this._displayGroup.push(dg);
        }

        this._displayGroup.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)); 


        this._observableDisplayGroupList.next(this._displayGroup);
        //this._observableMessagesGroupList.next(this._messagesGroup);

    }


    public db: any;

    createDatabase() {
        this.db = new Dexie('DatumUnsubscriberDatabase');
        this.db.version(1).stores({
            mails: 'id,from,subject,threadId,unread,unsubscribeUrl,internalDate,hostname,status'
        });
    }

    getMessagesForDomain(domain:string) {

        return this.db.mails.where("hostname").equalsIgnoreCase(domain);

        /*
        return this.db.mails.orderBy('internalDate').filter(function (m) {
            return m.hostname === domain;
        });
        */

        
    }


    resetDatabase() {
        return this.db.delete();
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

    init(callback) {
        this.createDatabase();

        //load actual config
        var self = this;
        
        chrome.storage.local.get(["config"], function (result) {
            if(result.config !== undefined) {
                self.userconfig = result.config;
                //check if token is expired
                if(self.userconfig.expires < new Date().getTime() / 1000) {
                    //token expired, refresh
                    self.refreshToken(self.userconfig.refresh_token).subscribe(result => {
                        self.setAccessToken(result.access_token, self.userconfig.refresh_token, result.expires_in, callback(self.userconfig));
                    }, error => {
                        alert('error:' + error);
                    });
                }
            } else {
                self.userconfig = new UserConfig();
                self.userconfig.firsttime = true;
            }

          

            callback(self.userconfig);
        });
    }

    getProfile() {
        return this.http.get<Profile>(this.baseUrl + "/profile?access_token=" + this.userconfig.access_token);
    }

    getMessage(id: string) {
        return this.http.get(this.baseUrl + "/messages/" + id + "?access_token=" + this.userconfig.access_token)
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
            var domain = mail.substr(at + 1);
            var dotCount = domain.split(".").length-1;
            if(dotCount > 1) {
                var ii = domain.indexOf('.');
                if(ii != -1) {
                    domain = domain.substr(ii + 1);
                }
            }
            return domain;
        }
    }

    return url;
}

function extractMail(url) {

    var iStart = url.lastIndexOf('<');
    var iEnd = url.lastIndexOf('>');

    if (iStart > -1 && iEnd > -1) {
        var mail = url.substr(iStart + 1, iEnd - iStart - 1);
        return mail;
    }

    return url;
}