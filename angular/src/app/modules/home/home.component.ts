import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit, NgZone } from '@angular/core';


import { DbService, UserService, UserConfig, ImapService, UIService } from '../../shared';
import { toTypeScript } from '@angular/compiler';

import { MdcTabActivatedEvent } from '@angular-mdc/web';

import { Message, MessageList, Profile, MessageGroup, DisplayGroup } from '../../shared/models'

import {
    mimeWordEncode, mimeWordDecode,
    mimeWordsEncode, mimeWordsDecode
} from 'emailjs-mime-codec'


@Component({
    selector: 'home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
// tslint:disable:variable-name
export class HomeComponent implements OnInit {
    constructor(
        private _userService: UserService,
        private _dbService: DbService,
        private _imapService: ImapService,
        private _uiService: UIService,
        private _changeDetector: ChangeDetectorRef,
        private zone: NgZone) { }

    isLoaded: boolean = false;
    isSyncing: boolean = false;
    bCancel: boolean = false;
    statusMessage: string = "";
    progress: number = 0;
    activeTab: number = 0;
    undhandledMails: DisplayGroup[] = [];
    unsubscribedMails: DisplayGroup[] = [];
    keepMails: DisplayGroup[] = [];
    deletedMails: any;
    userConfig: UserConfig;




    //main app init
    async ngOnInit() {
        var self = this;


        this.statusMessage = "init config...";

        this.userConfig = await this._userService.initConfig();
        this._dbService.create();
        await this._dbService.init();

        if (!this.userConfig.firsttime) {
            if (this.userConfig.password == "") {
                this._uiService.showPasswordConfirm(function (password) {
                    self.userConfig.password = password;
                    self.bind();
                });
                return;
            }
        }
        this.bind();
    }

    bind() {

        var self = this;

        this.statusMessage = "init imap client...";


        //init the imap client
        this._imapService.init(this.userConfig.username, this.userConfig.password, this.userConfig.imapurl, this.userConfig.imapport, this.userConfig.isGmailProvider, async function (pem) {

            //set imap mode
            self._imapService.setGmailSearchMode(self.userConfig.isGmailProvider);


            try {
                //open imap for further processing
                await self._imapService.open();
            } catch (error) {
                self._uiService.showAlert(error);
            }


            self.statusMessage = "loading database...";

            self._dbService.undhandledMails.subscribe(function (mails) {
                self.undhandledMails = self.groupMails(mails);
                self.isLoaded = true;
            });


            self._dbService.keepMails.subscribe(function (mails) {
                self.keepMails = self.groupMails(mails);
            });

            self._dbService.unsubpMails.subscribe(function (mails) {
                self.unsubscribedMails = self.groupMails(mails);
            });

        });

    }


    cancel() {
        this.bCancel = true;
        this._imapService.setCancel();
    }

    /* sync the mails from imap to local */
    async sync() {
        var self = this;

        try {

            //set sync mode for UI
            this.isSyncing = true;

            //set ui info
            self.statusMessage = "searching for mails...";

            //get all ids with given search term
            var ids = await self._imapService.getMailIds();

            //get total count of mails to process
            var totalCount = ids.length;

            //download all mails
            var fullResult = await self._imapService.getMailContent(ids, async function (workedCount, fetchedMails) {
                self.statusMessage = workedCount.toString() + ' downloaded (' + Math.round((workedCount / totalCount) * 100) + '%)';
                self.progress = (Math.round((workedCount / totalCount) * 100)) / 100;

            });

            //set ui info
            self.statusMessage = "importing mails...";


            self.bCancel = false;

            for (var i = 0; i < fullResult.length; i++) {


                if (self.bCancel) {
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

            await self._dbService.refresh();

            self.bCancel = false;

            //set sync mode OFF for UI
            self.isSyncing = false;

            //close client
            //await self._imapService.close();
        } catch (error) {
            self._uiService.showAlert(error);
        }
    }

    tabChanged(event: MdcTabActivatedEvent): void {
        this.activeTab = event.index;
    }


    groupDisplay(msgList) {
        var group = {};
        var dspGroup = [];
        msgList.forEach((item: MessageGroup) => {
            var firstDomainChar = item.hostname.substring(0, 1).toLocaleLowerCase();
            group[firstDomainChar] = group[firstDomainChar] || [];
            group[firstDomainChar].push(item);
        });

        //create list with all grouped
        for (var key in group) {
            var dg = new DisplayGroup();
            dg.name = key.toUpperCase();
            dg.messagegroups = group[key];
            dspGroup.push(dg);
        }

        dspGroup.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));

        return dspGroup;
    }

    groupMails(msgList) {

        var group = {};
        var self = this;
        var msgGroup = [];
        var dspGroup = [];

        msgList.forEach((item: Message) => {
            group[item.hostname] = group[item.hostname] || [];
            group[item.hostname].push(item);
        });

        //create list with all grouped
        for (var key in group) {
            var mg = new MessageGroup();
            mg.name = extractMailFromName(group[key][0].from);
            mg.messages = [];//group[key];
            mg.messageCount = group[key].length;
            mg.hostname = group[key][0].hostname;
            mg.subject = group[key][0].subject;
            msgGroup.push(mg);
        }

        group = {};
        msgGroup.forEach((item: MessageGroup) => {
            var firstDomainChar = item.hostname.substring(0, 1).toLocaleLowerCase();
            group[firstDomainChar] = group[firstDomainChar] || [];
            group[firstDomainChar].push(item);
        });

        //create list with all grouped
        for (var key in group) {
            var dg = new DisplayGroup();
            dg.name = key.toUpperCase();
            dg.messagegroups = group[key];
            dspGroup.push(dg);
        }

        dspGroup.sort((a, b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));



        return dspGroup;

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
            /*
            var dotCount = domain.split(".").length - 1;
            if (dotCount > 1) {
                var ii = domain.indexOf('.');
                if (ii != -1) {
                    domain = domain.substr(ii + 1);
                }
            }
            */
            return domain;
        }
    }
    return url;
}


function extractMailFromName(from) {
    var iStart = from.lastIndexOf('<');
    var iEnd = from.lastIndexOf('>');
    var fromName = from;
    if (iStart > -1 && iEnd > -1) {
        fromName = from.substr(0, iStart);
    }
    return fromName;
}