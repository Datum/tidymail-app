import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BehaviorSubject, Observable } from 'rxjs';



import { Message } from '../models';

import { Base64 } from 'js-base64';



@Injectable()
export class GmailService {

    constructor(private http: HttpClient) { }

    baseUrl: string = "https://www.googleapis.com/gmail/v1/users/me";
    tokenUrl: string = 'https://www.googleapis.com/oauth2/v4/token';
    clientid: string = "187423944392-87r99e4mn2bdhr1q7e3gjg2v5hohp08a.apps.googleusercontent.com";
    clientsecret: string = "26OcvwqMmwMe6wF8uOFGPBj0";

    authUrl: string = "https://accounts.google.com/o/oauth2/auth"
        + '?response_type=code&access_type=offline&approval_prompt=force&client_id=' + this.clientid
        + '&scope=' + "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify"
        + '&redirect_uri=' + chrome.identity.getRedirectURL("oauth2");

    accessToken: string;
    defaultSearch: string = "list:";


    //used to cancel long running processes
    private bCancel: boolean = false;


    setAccessToken(token: string) {
        this.accessToken = token;
    }

    cancelProcess(bCancel = true) {
        this.bCancel = bCancel;
    }

    refreshToken(refresh_token) {
        return this.http.post<any>(this.tokenUrl, { client_id: this.clientid, client_secret: this.clientsecret, refresh_token: refresh_token, grant_type: "refresh_token" }).toPromise();
    }

    getToken(code, client_id, callback) {
        return this.http.post<any>(this.tokenUrl, { code: code, client_id: client_id, client_secret: this.clientsecret, grant_type: "authorization_code", redirect_uri: chrome.identity.getRedirectURL("oauth2") });
    }

    delete(msgId: string) {
        return this.http.post(this.baseUrl + "/messages/" + msgId + "/trash?access_token=" + this.accessToken, null).toPromise();
    }


    findFirst(searchTerm = this.defaultSearch) {
        return this.http.get(this.baseUrl + "/messages?access_token=" + this.accessToken + "&q=" + searchTerm);
    }




    findAll(searchTerm: string, callback, pageCallback = null, lastKnownId: string = null) {
        var r = [];
        this.loadMessageIds(null, r, callback, pageCallback, lastKnownId);
    }

    /*
    findWithResults(searchTerm: string, callback, lastKnownId: string = null) {
        var r = [];
        this.loadMessageIds(null, r, callback, true, lastKnownId);
    }
    */


    login() {
        return new Promise<any>(
            (resolve, reject) => {
                var self = this;
                chrome.identity.launchWebAuthFlow({ 'url': this.authUrl, 'interactive': true }, function (redirectUrl) {
                    if (redirectUrl) {
                        var parsed = parse(redirectUrl.substr(chrome.identity.getRedirectURL("oauth2").length + 1));
                        //get tokens from code
                        self.getToken(parsed.code, self.clientid, null).subscribe(function (result) {
                            //store tokens and run callback
                            self.accessToken = result.access_token;
                            resolve(result);
                        });
                    } else {
                        reject("launchWebAuthFlow login failed. Is your redirect URL (" + chrome.identity.getRedirectURL("oauth2") + ") configured with your OAuth2 provider?");
                    }
                });
            }
        )



    }



    private loadMessageIds(nextPageToken, list, callback, callPageCallback = null, lastKnownId: string = null) {
        var self = this;

        var url = this.baseUrl + "/messages?access_token=" + this.accessToken + "&q=list:";
        if (nextPageToken) {
            url += "&pageToken=" + nextPageToken;
        }

        this.http.get<any>(url).subscribe(async function (result) {
            list = list.concat(result.messages);

            //check if list contains last know id, if yes, cancel indexing
            if (lastKnownId) {
                if (list.filter(e => e.id === lastKnownId).length > 0) {
                    self.bCancel = true;
                }
            }

            if (result.nextPageToken && !self.bCancel /*&& mailExists === undefined*/) {
                if (callPageCallback) {
                    callPageCallback(result.messages);
                }
                self.loadMessageIds(result.nextPageToken, list, callback, callPageCallback);
            } else {
                callback(list);
            }
        });
    }


    async getMessageDetail(messageId: string) {

        //try to get in batch of 25 requests

        var msg = await this.http.get<Message>(this.baseUrl + "/messages/" + messageId + "?access_token=" + this.accessToken).toPromise();

        for (var a = 0; a < msg.payload.headers.length; a++) {
            if (msg.payload.headers[a].name == "Subject") {
                msg.subject = msg.payload.headers[a].value;
            }

            if (msg.payload.headers[a].name == "From") {
                msg.from = msg.payload.headers[a].value;
                msg.hostname = extractHostname(msg.payload.headers[a].value);

            }

            if (msg.payload.headers[a].name == "List-Unsubscribe") {
                //check if headers is array with url and email to unsubscribe, google separate it by comma
                var targets = msg.payload.headers[a].value.split(',');
                targets.forEach(el => {
                    el = el.trim();
                    if (el.substring(0, 1) == "<" && el.substring(el.length - 1) == ">") {
                        el = el.substring(1, el.length - 1);
                    }

                    if (el.indexOf('mailto:') != -1) {
                        //it's email
                        msg.unsubscribeEmail = el;
                    } else {
                        msg.unsubscribeUrl = el;
                    }
                });
            }
        }


        //if no unsubscribe header found, try to get from body
        if (msg.unsubscribeUrl === undefined) {
            try {
                if (msg.payload.body.data !== undefined) {
                    var plainText = '';
                    try {
                        plainText = Base64.decode(msg.payload.body.data);
                    } catch (error) {
                        console.log(error);
                    }

                    //Extract urls from body
                    var urls = getURLsFromString(plainText);
                    var bUnSub = false;
                    for (var u = 0; u < urls.length; u++) {
                        var n = urls[u].search("unsub");
                        if (n != -1) {
                            msg.unsubscribeUrl = urls[u];
                        }
                    }
                }
            } catch (error) {
                //alert(error);
            }
        }


        msg.status = 0;
        msg.unread = (msg.labelIds.indexOf("UNREAD") > -1)
        msg.isChecked = false;

        return msg;
    }
}





function extractHostname(url) {


    var iStart = url.lastIndexOf('<');
    var iEnd = url.lastIndexOf('>');

    if (iStart > -1 && iEnd > -1) {
        var mail = url.substr(iStart + 1, iEnd - iStart - 1);
        var at = mail.lastIndexOf('@');
        if (at != -1) {
            var domain = mail.substr(at + 1);
            var dotCount = domain.split(".").length - 1;
            if (dotCount > 1) {
                var ii = domain.indexOf('.');
                if (ii != -1) {
                    domain = domain.substr(ii + 1);
                }
            }
            return domain;
        }
    }

    return url;
}

function getURLsFromString(str) {
    var re = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%\/.\w-]*)?\??(?:[-+=&;%@.\w]*)#?\w*)?)/gm;
    var m;
    var arr = [];
    while ((m = re.exec(str)) !== null) {
        if (m.index === re.lastIndex) {
            re.lastIndex++;
        }
        arr.push(m[0]);
    }
    return arr;
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