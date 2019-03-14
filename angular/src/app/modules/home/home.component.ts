import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit, NgZone } from '@angular/core';


import { DbService, UserService, UserConfig } from '../../shared';
import { toTypeScript } from '@angular/compiler';

import { MdcTabActivatedEvent } from '@angular-mdc/web';

import { Message, MessageList, Profile, MessageGroup, DisplayGroup } from '../../shared/models'


@Component({
    selector: 'home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
// tslint:disable:variable-name
export class HomeComponent implements OnInit {
    constructor(private _userService:UserService, private _dbService:DbService, private _changeDetector: ChangeDetectorRef, private zone: NgZone) { }

    isLoaded: boolean = false;
    activeTab:number = 0;
    undhandledMails:DisplayGroup[];
    unsubscribedMails:DisplayGroup[];
    keepMails:DisplayGroup[];
    deletedMails:any;
    userConfig:UserConfig;

    async ngOnInit() {

        var self = this;

        try {
            //get config
            this.userConfig = this._userService.getConfig();
            this._dbService.create();
            await this._dbService.init();
        } catch(error) {
            alert(error);
        }

        this._dbService.undhandledMails.subscribe(function(mails) {
            self.undhandledMails = self.groupMails(mails);
            self.isLoaded = true;
        });

        this._dbService.keepMails.subscribe(function(mails) {
            self.keepMails = self.groupMails(mails);
        });

        this._dbService.unsubpMails.subscribe(function(mails) {
            self.unsubscribedMails = self.groupMails(mails);
        });

    }

    tabChanged(event: MdcTabActivatedEvent): void { 
        this.activeTab = event.index;
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
            mg.name = key;
            mg.messages = group[key];
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

