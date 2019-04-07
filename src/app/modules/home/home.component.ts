import { Component, OnInit, NgZone } from '@angular/core';
import { MatSnackBar } from "@angular/material";
import { UserService, ImapService, DbService, UIService, DisplayGroup, UserConfig, SmtpService } from 'src/app/shared';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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


    isConnected: boolean = false;
    isSmtpConnected: boolean = false;
    isSyncing: boolean = false;
    bCancel: boolean = false;
    statusMessage: string;
    userConfig: UserConfig;


    undhandledMails: Observable<DisplayGroup[]>;
    keepMails: Observable<DisplayGroup[]>;
    unsubscribedMails: Observable<DisplayGroup[]>;

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

        //by default start a sync
        if (!this.userConfig.firsttime) {
            if (this.userConfig.autoSync || this.userConfig.autoSync === undefined) {
                await this.sync();
            }
        }
    }

    async bind() {

        await this._dbService.init();

        this.undhandledMails = this._dbService.newMails;
        this.keepMails = this._dbService.keepMails;
        this.unsubscribedMails = this._dbService.unsubbedMails;
    }

    async connect() {
        if (!this.isConnected) {

            //set sync mode for UI
            this.isSyncing = true;

            //set ui info
            this.statusMessage = "connecting to server...";

            //create client with config
            await this._imapService.create(this.userConfig.username, this.userConfig.password, this.userConfig.imapurl, this.userConfig.imapport, this.userConfig.trashBoxPath);

            //open
            await this._imapService.open();

            //set sync mode for UI
            this.isSyncing = false;

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

            //set sync mode for UI
            this.isSyncing = false;
        }
    }

    async sync() {
        var self = this;
        try {

            await this._zone.runOutsideAngular(async () => {

                console.time('start.sync');

                //connect if needed
                await this.connect();

                //set sync mode for UI
                this.isSyncing = true;

                //set ui info
                this.statusMessage = "searching for new newsletters...";

                //get all ids with given search term
                var ids = await this._imapService.getMailIds(false);

                //exclude all processed
                var processedKeys = await this._dbService.getProcessedIds();

                ids = ids.filter(function (el) {
                    return processedKeys.indexOf(el) < 0;
                });
                //get total count of mails to process
                var totalCount = ids.length;

                //start with newest first
                ids = ids.reverse();



                //download all mails
                var fullResult = await self._imapService.getMailContent(ids, async function (workedCount, dynamicTotalCount, fetchedMails, cancelled) {
                    for (var i = 0; i < fetchedMails.length; i++) {
                        self.statusMessage = (workedCount + i) + '/' + totalCount + ' (' + Math.round(((workedCount + i) / totalCount) * 100) + '%)';

                        if (cancelled) {
                            break;
                        }

                        self._dbService.add(fetchedMails[i]);
                    }
                });

                //force view update for new mail
                console.log('force view update');
                this._dbService.updateView(0);

                //set cancel back
                this.bCancel = false;

                //set sync mode OFF for UI
                this.isSyncing = false;

                //close client
                //await this._imapService.close();

                console.timeEnd('start.sync');
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
    }

    async onKeepMsg(id) {
        await this._dbService.keep(id);
    }

    async onUnsubscribeMsg(id) {
        var self = this;
        var msg = await this._dbService.getMsgById(id);
        if (msg !== undefined) {
            var unSubInfo = getUnsubscriptionInfo(msg.unsubscribeEmail);
            if (unSubInfo.email != "") {
                await this.connectSmtp();
                await this._smtpService.send(self.userConfig.email, unSubInfo.email, unSubInfo.subject == "" ? "Unsubscribe" : unSubInfo.subject);
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
    }

    async onDeleteDomain(hostname) {
        this.isSyncing = true;

        //check if imap connected
        await this.connect();

        //get all messages for domain
        var allMessagesToDelete = await this._dbService.getMailsByHostname(hostname);

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

    async onKeepMsgDomain(hostname) {
        this.isSyncing = true;

        //get all messages for domain
        var allMessageToKeep = await this._dbService.getMailsByHostname(hostname);

        for (var i = 0; i < allMessageToKeep.length; i++) {
            await this.onKeepMsg(allMessageToKeep[i].lastId);
        }

        this.isSyncing = false;
    }


    async onUnsubscribeDomain(hostname) {
        this.isSyncing = true;
        //get all messages for domain
        var allMessagesToUnSubscribe = await this._dbService.getMailsByHostname(hostname);
        for (var i = 0; i < allMessagesToUnSubscribe.length; i++) {
            await this.onUnsubscribeMsg(allMessagesToUnSubscribe[i].lastId);
        }
        this.isSyncing = false;
    }

}


function getUnsubscriptionInfo(unsubString) {
    var r = { email: '', url: '', subject: '' };
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
                var params = r.email.substr(iWithParameter + 1);
                var paramsObject = JSON.parse('{"' + decodeURI(params.replace(/&/g, "\",\"").replace(/(?<!=)=(?!=)/g, "\":\"")) + '"}');
                if (paramsObject.subject) {
                    r.subject = paramsObject.subject;
                }
                r.email = r.email.substring(0, iWithParameter);
            }
            //check if email has subject included

            return r;
        } else {
            r.url = parts[i];
        }
    }

    return r;
}
