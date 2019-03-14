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

    messages: any = [];
    messagesGroups: any = [];
    displayGroups: any = [];
    isLoaded: boolean = false;
    messageCount: number = 0;
    loadingText: string = "Connecting...";
    newMailcount: number = 0;

    test() {
        alert('test');
    }

    activeTab:number = 0;

    tabChanged(event: MdcTabActivatedEvent): void { 
        this.activeTab = event.index;
    }


    undhandledMails:DisplayGroup[] = []
    unsubscribedMails:DisplayGroup[] = [];
    keepMails:DisplayGroup[] = [];
    deletedMails:any;


    userConfig:UserConfig;


    undhandledMailsCount:number;

    async ngOnInit() {

        var self = this;

        try {
            //get config
            this.userConfig = this._userService.getConfig();
            this._dbService.create();
            await this._dbService.init();
            //this.unsubscribedMails = this.groupMails(await this._dbService.filterEquals("status",1).toArray());
            //this.keepMails = this.groupMails(await this._dbService.filterEquals("status",2).toArray());
        } catch(error) {
            alert(error);
        }


        this._dbService.undhandledMails.subscribe(function(mails) {
            self.undhandledMails = self.groupMails(mails);
        });

        this._dbService.keepMails.subscribe(function(mails) {
            self.keepMails = self.groupMails(mails);
        });


        this._dbService.newMessage.subscribe(function (msg) {
            if(msg) {
                alert(msg.subject);
            }
        });


        //add subscriber for data change, e.g from sync by app component


        /*
        this._dataService.messagesList.subscribe(function (result) {
            self.zone.run(() => {
                self.messages = result;
                self.loadingText = "Downloading index for emails.... (" + self.messages.length + " indexed)";
            });
        });

        this._dataService.messagesGroupList.subscribe(function (result) {
            self.zone.run(() => {
                self.messagesGroups = result;
            });
        });

        this._dataService.messagesDisplayList.subscribe(function (result) {
            self.zone.run(() => {
                self.displayGroups = result;
            });
        });

        this._dataService.logMessage.subscribe(function (result) {
            self.zone.run(() => {
                self.newMailcount = parseInt(result);
                self.loadingText = "Downloading mail body and analyzing " + result + " emails...";
            });
        });
        */

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




    getMessages() {

        /*
            .subscribe(resp => {
                alert(resp.messages.length);
                alert(resp.resultSizeEstimate);
                this.messages = resp.messages;
                //this.tabs[0].count = resp.messages.length;
                this._changeDetector.detectChanges();


                //get details

                var index = 0;

                //this.loadItem(index, this.messages.length);
            }, error => {
                //try to relog
                //this.login();
            });
            */
    }

    loadItem(index, maxRows) {
        /*
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
                    //alert(msg.id);
                }   
            }

            index++;
            if(index < maxRows) {
                this._changeDetector.detectChanges();
                this.loadItem(index, maxRows);
            } 
        });
        */
    }
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
