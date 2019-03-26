import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit } from '@angular/core';
import { TAB_ID } from './tab-id.injector';
import { DbService, UserService, ImapService } from './shared';
import { Message } from './shared/models';
import { DialogAlert } from './dialog-alert';
import { MdcDialog, MdcDialogRef, MDC_DIALOG_DATA } from '@angular-mdc/web';

import { Router } from '@angular/router';



@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {


    constructor(
        @Inject(TAB_ID) private _tabId: number,
        private _changeDetector: ChangeDetectorRef,
        private _userService: UserService,
        private _imapService: ImapService,
        private router: Router,
        private _dbService: DbService, ) { }
    
    isLoggedIn: boolean = false;
    isLoaded: boolean = false;
    userConfig: any;


    //main app init
    async ngOnInit() {

        var self = this;

        try {

            //create/init database
            this._dbService.create();

            //create init user 
            var userConfig = await this._userService.initConfig();
            this.userConfig = userConfig;

            if (userConfig.firsttime) {
                this.router.navigateByUrl('/install');
            } else {
                //init the imap client
                this._imapService.init(this.userConfig.username, this.userConfig.password, this.userConfig.imapurl, this.userConfig.imapport, this.userConfig.isGmailProvider, async function (pem) {

                    //set imap mode
                    self._imapService.setGmailSearchMode(self.userConfig.isGmailProvider);

                    //open imap for further processing
                    await self._imapService.open();

                    self.isLoaded = true;
                    //var boxes = await self._imapService.getMailBoxes();
                    self.isLoggedIn = true;
                });
            }
        } catch (error) {
            //this.showAlert(error);
        }
    }
}

