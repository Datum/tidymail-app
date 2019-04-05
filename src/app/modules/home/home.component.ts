import { Component, OnInit } from '@angular/core';
import { UserService, ImapService, DbService, UIService, DisplayGroup, UserConfig, SmtpService } from 'src/app/shared';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

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
        private http: HttpClient
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
        this._dbService.create();

        //get config
        this.userConfig = this._userService.getConfig();

        //if password is not in config, prompt user
        if (this.userConfig.password == "") {
            return;
        }

        //bind lists
        await this.bind();

        //by default start a sync
        if(!this.userConfig.firsttime) {
            await this.sync();
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

            console.time('start.sync');

            //connect if needed
            await this.connect();

            //set sync mode for UI
            this.isSyncing = true;

            //set ui info
            this.statusMessage = "searching for new newsletters...";

            //get all ids with given search term
            var ids = await this._imapService.getMailIds();

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

                    //console.time("dbService.add");
                    await self._dbService.add(fetchedMails[i]);
                    //console.timeEnd("dbService.add");
                }

                //sync ui to storage
                await self._dbService.syncToStorage();
            });

            //set cancel back
            this.bCancel = false;

            //set sync mode OFF for UI
            this.isSyncing = false;

            //close client
            //await this._imapService.close();

            console.timeEnd('start.sync');
        } catch (error) {
            console.error(error);
            self._uiService.showAlert(error);
        }
    }


    cancel() {
        this.isSyncing = !this.isSyncing;
        this._imapService.setCancel();
    }



    async onDeleteMsg(id) {
        await this.connect();

        var msg = await this._dbService.exists(id);
        if (msg !== undefined) {
            //move to delete
            await this._dbService.delete(id);

            try {
                msg.ignoreIds.push(id);
                await this._imapService.moveTrash(msg.ignoreIds);
            } catch (error) {
                console.log(error);
            }
        }
    }

    async onKeepMsg(id) {
        //await this.connect();
        await this._dbService.keep(id);
    }

    async onUnsubscribeMsg(id) {
        var self = this;
        var msg = await this._dbService.exists(id);
        if (msg !== undefined) {
            await this.connectSmtp();
            var unSubInfo = getUnsubscriptionInfo(msg.unsubscribeEmail);
            if (unSubInfo.email != "") {
                await this._smtpService.send(self.userConfig.email, unSubInfo.email, unSubInfo.subject == "" ? "Unsubscribe" : unSubInfo.subject);
                await this._dbService.unsubscribe(id);
            } else {
                if (unSubInfo.url != "") {
                    await this.http.get<any>(unSubInfo.url).toPromise();
                }
            }
        }
    }

    async onDeleteDomain(hostname) {
        this.isSyncing = true;

        var allMessagesToDelete = await this._dbService.filterEqualsIgnoreCase("hostname", hostname).toArray();

        for (var i = 0; i < allMessagesToDelete.length; i++) {
            this.statusMessage = 'Delete ' + i + ' of ' + allMessagesToDelete.length;
            await this.onDeleteMsg(allMessagesToDelete[i].lastId);
        }

        this.isSyncing = false;
    }

    async onKeepMsgDomain(hostname) {
        this.isSyncing = true;

        var allMessageToKeep = await this._dbService.filterEqualsIgnoreCase("hostname", hostname).toArray();

        for (var i = 0; i < allMessageToKeep.length; i++) {
            await this.onKeepMsg(allMessageToKeep[i].lastId);
        }

        this.isSyncing = false;
    }
    async onUnsubscribeDomain(hostname) {
        this.isSyncing = true;

        var allMessagesToUnSubscribe = await this._dbService.filterEqualsIgnoreCase("hostname", hostname).toArray();

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
            if(iWithParameter != -1) {
                var params = r.email.substr(iWithParameter+1);
                var paramsObject = JSON.parse('{"' + decodeURI(params.replace(/&/g, "\",\"").replace(/(?<!=)=(?!=)/g,"\":\"")) + '"}');
                if(paramsObject.subject) {
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
