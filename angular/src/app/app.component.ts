import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit } from '@angular/core';

import { TAB_ID } from './tab-id.injector';


import { GmailService, DbService, UserService, ImapService } from './shared';

import { Message } from './shared/models';

import { DialogAlert } from './dialog-alert';



import { MdcDialog, MdcDialogRef, MDC_DIALOG_DATA } from '@angular-mdc/web';




import {
    mimeWordEncode, mimeWordDecode,
    mimeWordsEncode, mimeWordsDecode
  } from 'emailjs-mime-codec'



import {
    transition,
    trigger,
    query,
    style,
    animate,
    group,
    animateChild
} from '@angular/animations';
import { ReturnStatement } from '@angular/compiler';

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
    progress: number = 0;

    imap_username: string;// = "florian@datum.org";
    imap_password: string;// = "meblmmoxaxwejrov";

    //imap_username: string = "florian.honegger@shinternet.ch";// "florian@datum.org";
    //imap_password: string = "tinetta,.12";// "meblmmoxaxwejrov";
    imap_host: string = 'mail.shinternet.ch';
    imap_port: string = '993';


    selectedMailProvider: string;
    //providers: string[] = ['Gmail', 'Other'];
    providers: string[] = ['Gmail', 'Other'];


    userConfig:any;


    providerSelectionChanged() {
        console.log(this.selectedMailProvider);
    }


    showAlert(msg) {
        const dialogRef = this.dialog.open(DialogAlert, {
            escapeToClose: false,
            clickOutsideToClose: false,
            buttonsStacked: false,
            id: 'my-dialog',
            data: { label: msg }
        });

        dialogRef.afterClosed().subscribe(result => {
            console.log(result);
        });
    }

    async login() {

        var self = this;

        if (this.selectedMailProvider != "Gmail") {
            if (this.imap_host == '' || this.imap_port == '') {
                alert('empty host / port');
            }
        } else {
            this.imap_host = 'imap.gmail.com';
            this.imap_port = "993";
        }

        if (this.imap_password == '' || this.imap_username == '') {
            alert('empty username/password');
            return;
        }

        //init imap service with credentials
        this._imapService.init(this.imap_username, this.imap_password, this.imap_host, this.imap_port, true, async function (pem) {

            //try to open 
            try {
                //open imap client
                await self._imapService.open();

                //check if host is gmail (supports gmail search, etc)
                var isProviderGmail = await self._imapService.isGmail();

                //if successfull , store to localStorage
                await self._userService.storeImapSettings(self.imap_host, self.imap_port, self.imap_username, self.imap_password, isProviderGmail);

                //close client
                //await self._imapService.close();

                //set user logged in
                self.isLoggedIn = true;

            } catch (error) {
                self.showAlert(error);
            }
        });
    }



    //main app init
    async ngOnInit() {
        var self = this;

        try {

            //create/init database
            this._dbService.create();

            //create init user 
            var userConfig = await this._userService.initConfig();
            this.userConfig = userConfig;

            console.log(userConfig);

            if (userConfig.firsttime) {
                //if first time show auto screen and login
                //var tokenResult = await this._gmailService.login();

                //console.log(tokenResult);
                //store tokens in localStorage
                //await self._userService.storeAccessTokens(tokenResult);
            } else {
    

                //init the imap client
                this._imapService.init(this.userConfig.username, this.userConfig.password, this.userConfig.imapurl, this.userConfig.imapport, this.userConfig.isGmailProvider, async function (pem) {
                    

                    self._imapService.setGmailSearchMode(self.userConfig.isGmailProvider);

                    //open imap for further processing
                    await self._imapService.open();


                    
                    //var boxes = await self._imapService.getMailBoxes();
                    self.isLoggedIn = true;
                });
            }
        } catch (error) {
            this.showAlert(error);
        }
    }

    messages = [];
    bCancel: boolean = false;

    constructor(
        @Inject(TAB_ID) private _tabId: number,
        private _changeDetector: ChangeDetectorRef,
        private _gmailService: GmailService,
        private _userService: UserService,
        private _imapService: ImapService,
        public dialog: MdcDialog,
        private _dbService: DbService, ) { }


    /* sync the mails from imap to local */
    async sync() {
        var self = this;


        try {

            //set sync mode for UI
            self.isSyncing = true;


            //get total stats about mailbox, mainly for modseq for further searches....
            var mb = await this._imapService.selectMailBox();


            /* {
            exists: 2303
flags: (7) ["\Answered", "\Flagged", "\Draft", "\Deleted", "\Seen", "$NotPhishing", "$Phishing"]
highestModseq: "219347"
permanentFlags: (8) ["\Answered", "\Flagged", "\Draft", "\Deleted", "\Seen", "$NotPhishing", "$Phishing", "\*"]
readOnly: false
uidNext: 2959
uidValidity: 1
            }
*/

            //set ui info
            self.statusMessage = "searching for mails...";

            //get all ids with given search term
            var ids = await self._imapService.getMailIds();

            //ids.length = 30;

            //get total count of mails to process
            var totalCount = ids.length;

            //await this._userService.storeLastRun();



            console.log('imap returns');
            console.log(ids);

            var newIds = [];

            //download only new ids

            /*
            for(var i = 0; i < ids.length;i++) {
                if(await self._dbService.exists(ids[i]) === undefined) {
                    newIds.push(ids[i]);
                }
            }
            */
            


            console.log('new ids');
            console.log(newIds);

        

            var updateCount = 0;

            //download all mails
            var fullResult = await self._imapService.getMailContent(ids,async  function (workedCount, fetchedMails) {
                updateCount++;
                self.statusMessage = workedCount.toString() + ' downloaded (' + Math.round((workedCount / totalCount) * 100) + '%)';
                self.progress = (Math.round((workedCount / totalCount) * 100)) / 100;

            });


            console.log('all goten');

            //set ui info
            self.statusMessage = "importing mails...";


            self.bCancel = false;

            for(var i = 0; i < fullResult.length;i++) {


                if(self.bCancel) {
                    break;
                }
             

                var msg = new Message();
                msg.id = fullResult[i].uid;
                msg.from = mimeWordsDecode(fullResult[i]['body[header.fields (from)]'].substr(6));

                //msg.from = msg.from.replace('"','');

                msg.from = msg.from.replace(/"/g, '');
                msg.internalDate = Date.parse(fullResult[i]['body[header.fields (date)]'].substr(6));
                msg.subject = mimeWordsDecode(fullResult[i]['body[header.fields (subject)]'].substr(9));
                msg.unsubscribeEmail = mimeWordsDecode(fullResult[i]['body[header.fields (list-unsubscribe)]'].substr(18));
                msg.hostname = extractHostname(msg.from);

                console.log(msg);

                //await self._dbService.add(msg, i % 10 == 0 ? true : false);
                await self._dbService.add(msg, false);
            }

            await self._dbService.refresh();

            self.bCancel = false;

            //set sync mode OFF for UI
            self.isSyncing = false;

            //close client
            //await self._imapService.close();
        } catch (error) {
            self.showAlert(error);
        }

      

        return;


        //var mails = await this._imapService.list();
        var mails = [];

        console.log(mails);

        var iDownloadccount = 0;
        var iupdateFrequence = 10;
        var workCount = 0;
        var totalCount = mails.length;

        await asyncForEach(mails, async (element) => {
            //if cancel flag set, return (break not possbile in async)
            if (self.bCancel) {
                return;
            }

            //check if id already known, if yes return
            if (await self._dbService.exists(element.uid) !== undefined) {
                return;
            }


            self.statusMessage = iDownloadccount.toString() + ' imported (' + Math.round((workCount / totalCount) * 100) + '%)';
            self.progress = (Math.round((workCount / totalCount) * 100)) / 100;
        });


        return;

        var self = this;
        var lastId = await this._dbService.getLastMailId();
        var syncCount = 0;

        this.isSyncing = true;

        var existsing = [];
        var ignoreIds = [];

        var msgUnsubs = await this._dbService.filterEquals("status", 1).toArray();
        var ignores = msgUnsubs.map(function (obj) { return obj.hostname; });
        ignores = ignores.filter(function (v, i) { return ignores.indexOf(v) == i; });

        this._gmailService.findAll(async function (mailIds) {

            var iDownloadccount = 0;
            var iupdateFrequence = 10;
            var workCount = 0;
            var totalCount = mailIds.length;

            //250



            self.bCancel = false;
            self.statusMessage = 'syncing...';

            await asyncForEach(mailIds, async (element) => {
                workCount++;

                //if cancel flag set, return (break not possbile in async)
                if (self.bCancel) {
                    return;
                }

                //check if id already known, if yes return
                if (await self._dbService.exists(element.id) !== undefined) {
                    return;
                }

                //update ui status test
                self.statusMessage = iDownloadccount.toString() + ' imported (' + Math.round((workCount / totalCount) * 100) + '%)';
                self.progress = (Math.round((workCount / totalCount) * 100)) / 100;

                //get complete message from gmail api
                var msg = await self._gmailService.getMessageDetail(element.id);

                //get all emails with same from, and add ids in db, so they can be ignored, only last msg is relevant
                var iFind = msg.from.indexOf('<');
                if (iFind != -1) {
                    var msgFromName = msg.from.substring(0, iFind).trim().replace('"', '');
                    var msgFromEmail = msg.from.substring(iFind + 1, msg.from.length - 1);


                    //from:"info@twitter.com" from:"Twitter for Business "
                    var rlMsgIdsList = [];
                    var rlMsgIds = await self._gmailService.loadMessageIdsWithQuery(null, "from:\"" + msgFromEmail + "\" from:\"" + msgFromName + "\"");
                    rlMsgIdsList = rlMsgIdsList.concat(rlMsgIds.messages);
                    var nxtPageToken = rlMsgIds.nextPageToken;
                    while (nxtPageToken) {
                        var rlMsgIds2 = await self._gmailService.loadMessageIdsWithQuery(nxtPageToken, "from:\"" + msgFromEmail + "\" from:\"" + msgFromName + "\"");
                        rlMsgIdsList = rlMsgIdsList.concat(rlMsgIds2.messages);
                        nxtPageToken = rlMsgIds2.nextPageToken;
                    }


                    if (rlMsgIdsList.length > 0) {
                        if (rlMsgIdsList[0] == undefined) {
                            console.log('ignore undefined');
                            return;
                        }
                    }

                    var result = rlMsgIdsList.map(function (e) { return e.id; });

                    for (var a = 0; a < result.length; a++) {
                        if (result[a] == msg.id) {
                            continue;
                        }
                        var msgIgnore = new Message();
                        msgIgnore.status = 4
                        msgIgnore.id = result[a];
                        msgIgnore.hostname = msg.hostname;
                        await self._dbService.add(msgIgnore, false);
                    }

                    ignoreIds = ignoreIds.concat(result);

                    msg.ignoredCount = result.length;

                    //if same from / email already exists ignore
                    /* }
                    */

                    //existsing.push(msgFromName+msgFromEmail);


                }

                //set ignore mails without link...
                msg.unsubscribeUrl === undefined ? msg.status = 4 : msg.status = 0;
                //set unsubscribe status for mails already done
                if (ignores.indexOf(msg.hostname) >= 0) {
                    msg.status = 1;
                }

                await self._dbService.add(msg, iDownloadccount % iupdateFrequence == 0 ? true : false);
                iDownloadccount++;
            });
            self.bCancel = false;
            self.isSyncing = false;
            self._gmailService.cancelProcess(false); //Enable
            self._dbService.refresh();

        }, function (mailPages) {
            syncCount += mailPages.length;
            self.statusMessage = 'indexing... ' + syncCount.toString();
        }, lastId !== undefined ? lastId.id : null);
    }



    cancel() {
        this.bCancel = true;
        //this._gmailService.cancelProcess();

        this._imapService.setCancel();
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