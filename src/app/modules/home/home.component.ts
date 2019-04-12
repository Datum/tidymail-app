import { Component, OnInit, NgZone } from '@angular/core';
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


    private _mailboxInfoChartObservable: BehaviorSubject<ChartData> = new BehaviorSubject(new ChartData());
    get chartDataMailbox(): Observable<ChartData> { return this._mailboxInfoChartObservable.asObservable() }

    private _newsletterInfoChartObservable: BehaviorSubject<ChartData> = new BehaviorSubject(new ChartData());
    get chartDataNewsletter(): Observable<ChartData> { return this._newsletterInfoChartObservable.asObservable() }
    

    chart:Observable<ChartData>;

    email:string;
    totalMails:number;
    totalSize:number;
    totalNewsletters:number;
    totalNewsletterSize:number;
    newsletterReadPercentage:number;
    

    private getMailBoxChartData(info) {
        var chartData = new ChartData();
        chartData.numbers = [info.totalMails - info.totalNewsletters, info.totalNewsletters]
        chartData.labels = ["OTHERS (" + (info.totalMails - info.totalNewsletters) + ")", "NEWSLETTERS (" + info.totalNewsletters + ")"];
        return chartData;
    }

    private async updateMailboxChart(totalMails: number) {
        var info = this.getMailBoxInfo();
        this._mailboxInfoChartObservable.next(this.getMailBoxChartData(info));
    }

    isConnected: boolean = false;
    isSmtpConnected: boolean = false;
    isSyncing: boolean = false;
    showProgress: boolean = false;
    syncProgress: number = 0;
    bCancel: boolean = false;
    statusMessage: string;
    userConfig: UserConfig;
    selectedTab: number = 0;
    showChart:boolean = true;


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

        this.updateNewsletterChart();

        if(this.userConfig.totalMails !== undefined) {
            this.updateMailboxChart(this.userConfig.totalMails);
        } else {
            this.showChart = false;
        }

        

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
        mb.totalMails = this.userConfig.totalMails;
        mb.totalNewsletters = this._dbService.getMsgCount();
        mb.totalNewsletterSize = this._dbService.getTotalSize();
        mb.newsletterReadPercentage = parseFloat((this._dbService.getTotalReadCount() / mb.totalNewsletters * 100).toFixed(2));
        return mb;
    }

    private updateNewsletterChart() {
        var c1 = this._dbService.getMsgCountWithStatus(0);
        var c2 = this._dbService.getMsgCountWithStatus(1);
        var c3 = this._dbService.getMsgCountWithStatus(2);
        var c4 = this._dbService.getMsgCountWithStatus(3);
        this._newsletterInfoChartObservable.next(this.getNewslettersChartData(c1, c2, c3, c4));
    }

    private getNewslettersChartData(newCount, keepCount, unsubscribeCount, deleteCount) {
        var chartData = new ChartData();
        chartData.numbers = [newCount, unsubscribeCount, keepCount, deleteCount]
        chartData.labels = ["New","Unsub","Keep","Delete"];
        return chartData;
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

                this.updateMailboxChart(this.userConfig.totalMails);
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



    async onDeleteMsg(msgId) {

        this.isSyncing = true;

        //if canceled, stop
        if (!await this.showDeleteConfirmation()) {
            return;
        }

        //connect if needed
        await this.connect();

        var msg = this._dbService.getMsgById(msgId);
        if (msg !== undefined) {
            try {
                var toDelete = msg.ignoreIds;
                toDelete.push(msgId);
                await this._imapService.moveTrash(msg.ignoreIds);

                //move to delete
                this._dbService.delete(msgId);
            } catch (error) {
                console.log(error);
            }
        }

        this.isSyncing = false;
    }

    async onKeepMsg(id) {
        await this._dbService.keep(id);
    }

    async onUnsubscribeMsg(id) {
        this.isSyncing = true;

        var self = this;
        var msg = await this._dbService.getMsgById(id);
        if (msg !== undefined) {
            var unSubInfo = getUnsubscriptionInfo(msg.unsubscribeEmail);
            if (unSubInfo.email != "") {
                this.statusMessage = 'Connecting SMTP...';

                //connect to smtp if needed
                await this.connectSmtp();

                //connect to imap if needed
                await this.connect();

                //send unsubscribe mail
                await this._smtpService.send(self.userConfig.email, unSubInfo.email, unSubInfo.subject == "" ? "Unsubscribe" : unSubInfo.subject);

                this.statusMessage = 'Move sent mail to trash...';

                //delete unsubscribe mail from sent box
                await this._imapService.deleteSentMails(unSubInfo.email);

                //move in db
                await this._dbService.unsubscribe(id);

                let snackBarRef = this.snackBar.open('Successfully unsubscribed!', null, { duration: 2000 });
            } else {
                if (unSubInfo.url != "") {
                    await this.http.get(environment.corsProxy + encodeURI(unSubInfo.url), { responseType: 'text' }).toPromise();
                    await this._dbService.unsubscribe(id);
                    let snackBarRef = this.snackBar.open('Successfully unsubscribed!', null, { duration: 2000 });
                }
            }

        }

        this.isSyncing = false;

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

    async onDeleteDomain(obj) {
        //if canceled, stop
        if (!await this.showDeleteConfirmation()) {
            return;
        }

        this.isSyncing = true;

        //check if imap connected
        await this.connect();

        //get all messages for domain
        var allMessagesToDelete = await this._dbService.getMailsWithHostnameAndStatus(obj.hostname, obj.status);

        //delete msg and all in ignored list in imap
        for (var i = 0; i < allMessagesToDelete.length; i++) {
            this.statusMessage = 'Delete ' + i + ' of ' + allMessagesToDelete.length;
            try {
                var toDelete = allMessagesToDelete[i].ignoreIds;
                toDelete.push(allMessagesToDelete[i].lastId);
                if (toDelete.length > 0) {
                    //move to trash
                    await this._imapService.moveTrash(allMessagesToDelete[i].ignoreIds);

                    //if moved in imap update status in db
                    this._dbService.delete(allMessagesToDelete[i].lastId);
                }
            } catch (error) {
                console.log(error);
            }
        }

        this.isSyncing = false;
    }

    async onKeepMsgDomain(obj) {
        this.isSyncing = true;

        //get all messages for domain
        var allMessageToKeep = await this._dbService.getMailsWithHostnameAndStatus(obj.hostname, obj.status);

        for (var i = 0; i < allMessageToKeep.length; i++) {
            await this.onKeepMsg(allMessageToKeep[i].lastId);
        }

        this.isSyncing = false;
    }


    async onUnsubscribeDomain(obj) {
        this.isSyncing = true;
        //get all messages for domain
        var allMessagesToUnSubscribe = await this._dbService.getMailsWithHostnameAndStatus(obj.hostname, obj.status);

        for (var i = 0; i < allMessagesToUnSubscribe.length; i++) {
            await this.onUnsubscribeMsg(allMessagesToUnSubscribe[i].lastId);
        }

        this.isSyncing = false;
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
                    var paramsObject = JSON.parse('{"' + decodeURI(params.replace(/&/g, "\",\"").replace(/(?<!=)=(?!=)/g, "\":\"")) + '"}');
                    if (paramsObject.subject) {
                        r.subject = paramsObject.subject;
                    }
                    if (paramsObject.body) {
                        r.body = paramsObject.body;
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
