import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit } from '@angular/core';

import { TAB_ID } from './tab-id.injector';


import { GmailService, DbService, UserService } from './shared';


import {
    transition,
    trigger,
    query,
    style,
    animate,
    group,
    animateChild
} from '@angular/animations';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    /*
    animations: [
        trigger('myAnimation', [
          transition('* => *', [
            query(
              ':enter',
              [style({ opacity: 0 })],
              { optional: true }
            ),
            query(
              ':leave',
               [style({ opacity: 1 }), animate('0.3s', style({ opacity: 0 }))],
              { optional: true }
            ),
            query(
              ':enter',
              [style({ opacity: 0 }), animate('0.3s', style({ opacity: 1 }))],
              { optional: true }
            )
          ])
        ])] // register the animations
        */
})
// tslint:disable:variable-name
export class AppComponent implements OnInit {
    readonly tabId = this._tabId;
    isLoggedIn: boolean = false;
    isLoaded: boolean = false;
    isSyncing: boolean = false;
    statusMessage: string = "";

    async ngOnInit() {
        //check if actual token still valid
        var self = this;


        try {

            //create/init database
            this._dbService.create();

            //create init user 
            var userConfig = await this._userService.initConfig();
            console.log(userConfig);
            if (userConfig.firsttime) {
                //if first time show auto screen and login
                var tokenResult = await this._gmailService.login();
                //store tokens in localStorage
                await self._userService.storeAccessTokens(tokenResult);
            } else {
                //check if token still valid
                if (userConfig.expires < new Date().getTime() / 1000) {
                    alert('expired');
                    //token expired, refresh
                    var refreshTokenResult = await this._gmailService.refreshToken(userConfig.refresh_token);
                    console.log(refreshTokenResult);
                    //store new token
                    await this._userService.storeAccessTokens(refreshTokenResult);
                }

                //init gmailService with tokens
                this._gmailService.setAccessToken(userConfig.access_token);
            }

            //set user logged in
            this.isLoggedIn = true;
        } catch (error) {
            alert(error);
        }
    }
    
    messages = [];
    bCancel:boolean = false;

    constructor(
        @Inject(TAB_ID) private _tabId: number,
        private _changeDetector: ChangeDetectorRef,
        private _gmailService: GmailService,
        private _userService: UserService,
        private _dbService: DbService, ) { }


    async sync() {
        var self = this;
        var lastId = await this._dbService.getLastMailId();
        var syncCount = 0;
        this.isSyncing = true;
        this._gmailService.findAll("list:", async function (mailIds) {
            //alert(mailIds.length);

            var iDownloadccount = 0;
            var iupdateFrequence = 10;

            self.bCancel = false;

            await asyncForEach(mailIds, async (element) => {
                if(self.bCancel) {
                    return;
                }
                var msg = await self._gmailService.getMessageDetail(element.id);
                self.statusMessage = 'downloading... ' + iDownloadccount.toString();
                await self._dbService.add(msg, iDownloadccount % iupdateFrequence == 0 ? true : false);
                iDownloadccount++;
            });
            self.bCancel = false;
            self.isSyncing = false;
            this._dbService.refresh();
        }, function (mailPages) {
            syncCount += mailPages.length;
            self.statusMessage = 'indexing... ' + syncCount.toString();
        }, lastId !== undefined ? lastId : null);
    }



    cancel() {
        this.bCancel = true;
        this._gmailService.cancelProcess();
    }

    /*
getMessages() {
    this._dataService.getMessages()
        .subscribe(resp => {
            
            this.messages = resp.messages;
            this.tabs[0].count = resp.messages.length;
            this._changeDetector.detectChanges();


            //get details

            var index = 0;

            //this.loadItem(index, 3);
        }, error => {
            //try to relog
            //this.login();
        });
}
*/

    /*
        loadItem(index, maxRows) {
            this._dataService.getMessage(this.messages[index].id).subscribe(msg => {
                for(var a = 0; a < msg.payload.headers.length;a++) {
                    if(msg.payload.headers[a].name == "Subject")
                    {
                        this.messages[index].subject = msg.payload.headers[a].value;
                    }
    
                    if(msg.payload.headers[a].name == "From")
                    {
                        this.messages[index].from = msg.payload.headers[a].value;
                    }
    
                    if(msg.payload.headers[a].name == "List-Unsubscribe")
                    {
                        this.messages[index].unsubscribeURL = msg.payload.headers[a].value;
                    }
                }
    
                
    
                //if no unsubscribe header found, try to get from body
                if(this.messages[index].unsubscribeURL === undefined) {
                    try {
                        var plainText = atob(msg.payload.body.data);
    
                        //Extract urls from body
                        var urls = getURLsFromString(plainText);
                        var bUnSub = false;
                        for(var u = 0;u < urls.length;u++) {
                            var n = urls[u].search("unsubscribe");
                            if(n != -1) {
                                
                                this.messages[index].unsubscribeURL = urls[u];
                            }
                        }
                    } catch(error) {
                        alert(msg.id);
                    }   
                }
    
                index++;
                if(index < maxRows) {
                    this._changeDetector.detectChanges();
                    this.loadItem(index, maxRows);
                } 
            });
        }
        */

    storeToken(accessToken: string) {
        chrome.storage.local.set({ token: accessToken }, function () {

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
            //this.message = message;
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

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}