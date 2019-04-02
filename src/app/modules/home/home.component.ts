import { Component, OnInit } from '@angular/core';
import { UserService, ImapService, DbService, UIService, DisplayGroup, UserConfig } from 'src/app/shared';
import { Observable } from 'rxjs';

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
    ) { }


    isConnected: boolean = false;
    isSyncing: boolean = false;
    bCancel: boolean = false;
    statusMessage: string;
    userConfig: UserConfig;


    undhandledMails: Observable<DisplayGroup[]>;
    keepMails: Observable<DisplayGroup[]>;
    unsubscribedMails: Observable<DisplayGroup[]>;

    async ngOnInit() {
        //init db
        this._dbService.create();

        //get config
        this.userConfig = this._userService.getConfig();

        //if password is not in config, prompt user
        if (this.userConfig.password == "") {
            return;
        }

        await this.bind();

        /*

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
        */

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

    async sync() {
        var self = this;
        try {
            //connect if needed
            await this.connect();

            //set sync mode for UI
            this.isSyncing = true;

            //set ui info
            this.statusMessage = "searching for new newsletters...";

            //get all ids with given search term
            var ids = await this._imapService.getMailIds();

            //get total count of mails to process
            var totalCount = ids.length;

            //start with newest first
            ids = ids.reverse();

            //download all mails
            var fullResult = await self._imapService.getMailContent(ids, async function (workedCount, dynamicTotalCount, fetchedMails) {
                self.statusMessage = (ids.length - dynamicTotalCount) + '/' + ids.length + ' (' + Math.round(((ids.length - dynamicTotalCount) / ids.length) * 100) + '%)';
                for (var i = 0; i < fetchedMails.length; i++) {

                    if (self.bCancel) {
                        break;
                    }

                    await self._dbService.add(fetchedMails[i]);
                }
            });

            //set cancel back
            this.bCancel = false;

            //set sync mode OFF for UI
            this.isSyncing = false;

            //close client
            //await this._imapService.close();
        } catch (error) {
            self._uiService.showAlert(error);
        }
    }


    cancel() {
        this.isSyncing = !this.isSyncing;
        this._imapService.setCancel();
    }



    async onDeleteMsg(id) {
        await this.connect();
        await this._dbService.delete(id);
        var msg = await this._dbService.exists(id);
        if (msg !== undefined) {
            console.log(msg);
            try {
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
        await this.connect();
        await this._dbService.unsubscribe(id);
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
