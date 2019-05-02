import { Component, OnInit, NgZone, HostListener } from '@angular/core';
import { MatSnackBar } from "@angular/material";
import { UserService, ImapService, DbService, UIService, DisplayGroup, UserConfig, SmtpService, ChartData } from 'src/app/shared';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MailBox } from 'src/app/shared/models/mailbox.model';


@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
    constructor(
        private _userService: UserService,
        private _imapService: ImapService,
        private _dbService: DbService,
        private _uiService: UIService,
        private _smtpService: SmtpService,
        private http: HttpClient,
        private snackBar: MatSnackBar,
        private _zone: NgZone
    ) { }

    email: string;
    isConnected: boolean = false;
    isSmtpConnected: boolean = false;
    isSyncing: boolean = false;
    showProgress: boolean = false;
    syncProgress: number = 0;
    bCancel: boolean = false;
    statusMessage: string;
    userConfig: UserConfig;
    selectedTab: number = 0;
    showChart: boolean = true;
    workCount:number = 0;


    undhandledMails: Observable<any[]>;
    keepMails: Observable<any[]>;
    unsubscribedMails: Observable<any[]>;

    undhandledMailsCount: number = 0;
    keepMailsCount: number = 0;
    unsubMailsCount: number = 0;

    private _mailboxObservable: BehaviorSubject<MailBox> = new BehaviorSubject(new MailBox());
    get userMailbox(): Observable<MailBox> { return this._mailboxObservable.asObservable() }


    async ngOnInit() {

        var self = this;

        //init db
        await this._dbService.create();

        //get config
        this.userConfig = this._userService.getConfig();

        //if password is not in config, prompt user
        if (this.userConfig.password == "") {
            return;
        }

        //bind lists
        await this.bind();

        this._mailboxObservable.next(this.getMailBoxInfo());

        //by default start a sync
        if (!this.userConfig.firsttime) {
            if (this.userConfig.autoSync || this.userConfig.autoSync === undefined) {
                await this.sync();
            }
        }
    }

    private getMailBoxInfo() {
        var mb = new MailBox();
        mb.email = this.userConfig.email;
        mb.totalMails = this.userConfig.totalMails === undefined ? 0 : this.userConfig.totalMails;
        mb.totalNewsletters = this._dbService.getNewsletterCount();
        mb.totalNewsletterSize = this._dbService.getTotalSize();
        mb.newsletterReadPercentage = parseFloat((this._dbService.getTotalReadCount() / mb.totalNewsletters * 100).toFixed(2));
        mb.totalSenders = this._dbService.getMsgCount();
        mb.totalNewNewsletters = this._dbService.getMsgCountWithStatus(0);
        mb.workedNewsletters = this.workCount;
        return mb;
    }

    async bind() {
        var self = this;
        await this._dbService.init();

        this.undhandledMails = this._dbService.newGroupedByHost;
        this.keepMails = this._dbService.keepGroupedByHost;
        this.unsubscribedMails = this._dbService.unsubGroupedByHost;

        this.undhandledMails.subscribe(function (msgs) {
            if (msgs.length > 0)
                self.undhandledMailsCount = msgs.map(item => item.count).reduce((prev, next) => prev + next);
        })
        this.keepMails.subscribe(function (msgs) {
            if (msgs.length > 0)
                self.keepMailsCount = msgs.map(item => item.count).reduce((prev, next) => prev + next);
        })
        this.unsubscribedMails.subscribe(function (msgs) {
            if (msgs.length > 0)
                self.unsubMailsCount = msgs.map(item => item.count).reduce((prev, next) => prev + next);
        })
    }

    async connect() {
        if (!this.isConnected) {

            //set sync mode for UI
            this.isSyncing = true;

            //set ui info
            this.statusMessage = "connecting to server...";

            //create client with config
            await this._imapService.create(this.userConfig.username, this.userConfig.password, this.userConfig.imapurl, this.userConfig.imapport, this.userConfig.trashBoxPath, this.userConfig.sentBoxPath);

            //open
            await this._imapService.open();

            this.isConnected = true;
        }
    }


    async connectSmtp() {
        if (!this.isSmtpConnected) {

            //set sync mode for UI
            this.isSyncing = true;

            //set ui info
            this.statusMessage = "connecting to server...";

            //create client with config
            await this._smtpService.create(this.userConfig.email, this.userConfig.password, this.userConfig.smtpurl, this.userConfig.smtpport);

            //open
            await this._smtpService.open();

            this.isSmtpConnected = true;
        }
    }

    async sync() {
        var self = this;
        try {
            await this._zone.runOutsideAngular(async () => {

                //set sync mode for UI
                this.isSyncing = true;
                this.showProgress = true;

                if (!environment.production) console.time('start.sync');

                //connect if needed
                await this.connect();

                //get mailbox stats, by default inbox
                var mailboxInfo = await this._imapService.selectMailBox();

                //store to config
                this.userConfig.totalMails = mailboxInfo.exists;
                this._userService.save(this.userConfig);

                //set ui info
                this.statusMessage = "searching for new newsletters...";

                //get last id
                var lastProcessedId = this._dbService.getLastId();

                //get all ids with given search term newer than lastProcessed
                var ids = await this._imapService.getMailIds(lastProcessedId);

                if (!environment.production) console.time('start.loaddb');
                //exclude all processed
                var processedKeys = await this._dbService.getIds();
                if (!environment.production) console.timeEnd('start.loaddb');

                if (!environment.production) console.time('start.filter');
                ids = ids.filter(function (el) {
                    return processedKeys.indexOf(el) < 0;
                });
                //get total count of mails to process
                if (!environment.production) console.timeEnd('start.filter');


                //start with newest first
                ids = ids.reverse();

                var totalCount = ids.length;
                var iUpdateFrequency = 1000;
                var index = 0;
                var lastId = ids.length > 0 ? ids[0] : 1;

                var dNewTab = new Date();
                dNewTab = new Date(dNewTab.setMonth(dNewTab.getMonth() - environment.countAsNewInMonth));

                //download all mails
                var fullResult = await self._imapService.getMailContent(ids, async function (workedCount, dynamicTotalCount, fetchedMails, cancelled) {
                    self.statusMessage = (workedCount) + '/' + totalCount + ' (' + Math.round(((workedCount) / totalCount) * 100) + '%)';
                    self.syncProgress = Math.round(((workedCount) / totalCount) * 100);
                    for (var i = 0; i < fetchedMails.length; i++) {
                        if (cancelled) {
                            break;
                        }

                        self._dbService.add(fetchedMails[i], dNewTab);

                        index++;


                        if (index % iUpdateFrequency == 0) {
                            self._dbService.updateViews();
                            self._mailboxObservable.next(self.getMailBoxInfo());
                        }
                    }
                    //self._dbService.updateView(0);
                });

                //force view update for new mail
                this._dbService.updateView(0);
                this._mailboxObservable.next(this.getMailBoxInfo());

                //set cancel back
                this.bCancel = false;

                //set sync mode OFF for UI
                this.isSyncing = false;
                this.showProgress = false;

                //close client
                //await this._imapService.close();

                //this._userService.saveLastUid(lastId);

                if (!environment.production) console.timeEnd('start.sync');
            });


        } catch (error) {
            console.error(error);
            self._uiService.showAlert(error);
        }
    }


    cancel() {
        this.isSyncing = !this.isSyncing;
        this._imapService.setCancel();
    }








    unsubQueue: any = [];
    private addUnsubscribeQueue(msgId) {
        this.unsubQueue.push(msgId);
        if (this.unsubQueue.length == 1) {
            this.doUnsubscription();
        }
    }


    onKeepMsg(id) {
        this.workCount++;
        this._dbService.keep(id);
        this._mailboxObservable.next(this.getMailBoxInfo());
    }


    onUnsubscribeMsg(msgId) {
        this.workCount++;
        this.addUnsubscribeQueue(msgId);
        this._dbService.unsubscribe(msgId);
        this._mailboxObservable.next(this.getMailBoxInfo());
    }


    onDeleteMsg(msgId) {
        this.workCount++;
        this.addDeleteQueue(msgId);
        this._dbService.delete(msgId);
        this._mailboxObservable.next(this.getMailBoxInfo());
    }


    showDeleteConfirmation() {
        var self = this;
        return new Promise<boolean>(
            (resolve, reject) => {
                if (this.userConfig.showDeleteConfirm || this.userConfig.showDeleteConfirm === undefined) {
                    this._uiService.showAlert("The Emails will be moved to your mailbox trash folder. Are you sure ?", "Confirmation", "They will be deleted after certain time depending on your settings.", "Remember?", function (result) {
                        if (result.checked) {
                            self.userConfig.showDeleteConfirm = false;
                            self._userService.save(self.userConfig);
                        }

                        resolve(result.state == 'ok' ? true : false);
                    });
                } else {
                    resolve(true);
                }
            }
        );
    }


    deleteQueue: any = [];

    private addDeleteQueue(msgId) {
        this.deleteQueue.push(msgId);
        if (this.deleteQueue.length == 1) {
            this.doDeletion();
        }
    }



    private async doUnsubscription() {
        if (this.unsubQueue.length == 0)
            return;

        var self = this;
        var msgId = this.unsubQueue[0];

        var msg = this._dbService.getMsgById(msgId);
        if (msg !== undefined) {
            var unSubInfo = getUnsubscriptionInfo(msg.unsubscribeEmail);
            if (unSubInfo.email != "") {
                //connect to smtp if needed
                await this.connectSmtp();

                //connect to imap if needed
                await this.connect();

                //send unsubscribe mail
                await this._smtpService.send(self.userConfig.email, unSubInfo.email, unSubInfo.subject == "" ? "Unsubscribe" : unSubInfo.subject);

                //delete unsubscribe mail from sent box
                await this._imapService.deleteSentMails(unSubInfo.email);
            } else {
                if (unSubInfo.url != "") {
                    await this.http.get(environment.corsProxy + encodeURI(unSubInfo.url), { responseType: 'text' }).toPromise();
                }
            }

        }

        this.unsubQueue.shift();
        this.doUnsubscription();

    }


    private async doDeletion() {
        if (this.deleteQueue.length == 0)
            return;


        var self = this;
        var msgId = this.deleteQueue[0];

        var msg = this._dbService.getMsgById(msgId);
        if (msg !== undefined) {
            try {
                var toDelete = msg.ignoreIds;
                toDelete.push(msgId);
                await this._imapService.moveTrash(msg.ignoreIds);
                
            } catch (error) {
                console.log(error);
            }

        }

        this.deleteQueue.shift();
        this.doDeletion();
    }


    onDeleteDomain(obj) {
        //get all messages for domain
        var allMessageToKeep = this._dbService.getMailsWithHostnameAndStatus(obj.hostname, obj.status);

        for (var i = 0; i < allMessageToKeep.length; i++) {
            this.onDeleteMsg(allMessageToKeep[i].lastId);
        }
    }

    onKeepDomain(obj) {
        //get all messages for domain
        var allMessageToKeep = this._dbService.getMailsWithHostnameAndStatus(obj.hostname, obj.status);

        for (var i = 0; i < allMessageToKeep.length; i++) {
            this.onKeepMsg(allMessageToKeep[i].lastId);
        }
    }


    onUnsubscribeDomain(obj) {
        //get all messages for domain
        var allMessagesToUnSubscribe = this._dbService.getMailsWithHostnameAndStatus(obj.hostname, obj.status);

        for (var i = 0; i < allMessagesToUnSubscribe.length; i++) {
            this.onUnsubscribeMsg(allMessagesToUnSubscribe[i].lastId);
        }
    }
}


function getUnsubscriptionInfo(unsubString) {
    var r = { email: '', url: '', subject: '', body: '' };
    var parts = unsubString.split(',');

    for (var i = 0; i < parts.length; i++) {
        parts[i] = parts[i].trim();
        parts[i] = parts[i].split('<').join('');
        parts[i] = parts[i].split('>').join('');

        if (parts[i].indexOf('@') != -1) {
            if (parts[i].indexOf(':') != -1) {
                parts[i] = parts[i].substr(parts[i].indexOf(':') + 1);
            }
            r.email = parts[i];

            var iWithParameter = r.email.indexOf('?');
            if (iWithParameter != -1) {
                try {
                    var params = r.email.substr(iWithParameter + 1);
                    //if any space in it truncate all behind space
                    params = params.split(' ')[0].trim();
                    // var paramsObject = JSON.parse('{"' + decodeURI(params.replace(/&/g, "\",\"").replace(/(?<!=)=(?!=)/g, "\":\"")) + '"}');
                    // var paramsObject=JSON.parse("test");
                    let searchParams  = new URLSearchParams(params);
                    if (searchParams.has("subject")) {
                        r.subject = searchParams.get("subject");
                    }
                    if (searchParams.has("body")) {
                        r.body = searchParams.get("body");
                    }
                    r.email = r.email.substring(0, iWithParameter);
                } catch (error) {
                    var queryString = r.email.substr(iWithParameter + 1).toLowerCase();
                    if (queryString.indexOf('subject=') != -1) {
                        r.subject = queryString.substr(queryString.indexOf('subject=') + 8);
                    }
                    r.email = r.email.substring(0, iWithParameter);
                }
            }
            //check if email has subject included

            return r;
        } else {
            r.url = parts[i];
        }
    }

    return r;
}
