import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Message, MessageList } from '../models';

@Injectable()
export class DataService {

    baseUrl: string = "https://www.googleapis.com/gmail/v1/users/me";

    authUrl: string = "https://accounts.google.com/o/oauth2/auth"
        + '?response_type=token&client_id=' + "187423944392-87r99e4mn2bdhr1q7e3gjg2v5hohp08a.apps.googleusercontent.com"
        + '&scope=' + "https://www.googleapis.com/auth/gmail.readonly"
        + '&redirect_uri=' + chrome.identity.getRedirectURL("oauth2");

    isLoggedIn: boolean = false;
    accessToken:string;

    constructor(
        private http: HttpClient,
    ) {

    }

    setAccessToken(token:string) {
        this.accessToken = token;
    }

    getConfig() {
        //return this.http.get(this.configUrl);
    }

    getMessages() {
       return this.http.get<MessageList>(this.baseUrl + "/messages?access_token=" + this.accessToken + "&format=full");
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
  