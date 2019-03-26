import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit } from '@angular/core';
import { TAB_ID } from './tab-id.injector';
import { DbService, UserService, ImapService } from './shared';
import { Message } from './shared/models';
import { DialogAlert } from './dialog-alert';
import { MdcDialog, MdcDialogRef, MDC_DIALOG_DATA } from '@angular-mdc/web';
import {
    mimeWordEncode, mimeWordDecode,
    mimeWordsEncode, mimeWordsDecode
  } from 'emailjs-mime-codec'


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
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

                //set imap client bavhior
                self._imapService.setGmailSearchMode(isProviderGmail);

                //if successfull , store to localStorage
                await self._userService.storeImapSettings(self.imap_host, self.imap_port, self.imap_username, self.imap_password, isProviderGmail);

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
        private _userService: UserService,
        private _imapService: ImapService,
        public dialog: MdcDialog,
        private _dbService: DbService, ) { }


    /* sync the mails from imap to local */
    async sync() {
        var self = this;


        console.log(this.userConfig);

        try {

            //set sync mode for UI
            self.isSyncing = true;

            var bb = await self._imapService.getMailBoxes();
            console.log(bb);


            //get total stats about mailbox, mainly for modseq for further searches....
            var mb = await this._imapService.selectMailBox();

            //return;


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
            var newIds = [];

            //download only new ids
            /*
            for(var i = 0; i < ids.length;i++) {
                if(await self._dbService.exists(ids[i]) === undefined) {
                    newIds.push(ids[i]);
                }
            }
            */
                    

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


                //await self._dbService.add(msg, i % 10 == 0 ? true : false);
                await self._dbService.add(msg, false);
            }


            console.log(mb.uidNext);

            await this._userService.storeLastRun(mb.uidNext);

            await self._dbService.refresh();

            self.bCancel = false;

            //set sync mode OFF for UI
            self.isSyncing = false;

            //close client
            //await self._imapService.close();
        } catch (error) {
            self.showAlert(error);
        }
    }



    cancel() {
        this.bCancel = true;
        //this._gmailService.cancelProcess();

        this._imapService.setCancel();
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