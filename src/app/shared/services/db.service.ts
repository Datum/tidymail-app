import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Message, MessageGroup, DisplayGroup } from '../models';

import * as parseDomain from 'parse-domain';
import * as loki from 'lokijs';
import * as lokiIndexedAdpater from 'lokijs/src/loki-indexed-adapter.js';


import {
    mimeWordEncode, mimeWordDecode,
    mimeWordsEncode, mimeWordsDecode
} from 'emailjs-mime-codec';
import { ResolveEnd } from '@angular/router';



@Injectable()
export class DbService {
    private _newGroupsObservable: BehaviorSubject<DisplayGroup[]> = new BehaviorSubject([]);
    get newMails(): Observable<DisplayGroup[]> { return this._newGroupsObservable.asObservable() }

    private _keepGroupsObservable: BehaviorSubject<DisplayGroup[]> = new BehaviorSubject([]);
    get keepMails(): Observable<DisplayGroup[]> { return this._keepGroupsObservable.asObservable() }

    private _unsubbedGroupsObservable: BehaviorSubject<DisplayGroup[]> = new BehaviorSubject([]);
    get unsubbedMails(): Observable<DisplayGroup[]> { return this._unsubbedGroupsObservable.asObservable() }



    constructor() { }

    db: any;
    memdb: any;
    name: string;
    memdb_mails: any;
    memdb_newMails: any;
    memdb_keepMails: any;
    memdb_unsubbedMails: any;

    create(name = "tidymail.db") {
        var self = this;

        return new Promise<boolean>(
            (resolve, reject) => {


                var adapter = new lokiIndexedAdpater();
                self.memdb = new loki("tidymail.db", {
                    adapter: adapter,
                    autoload: true,
                    autoloadCallback: databaseInitialize,
                    autosave: true,
                    autosaveInterval: 4000
                });

                function databaseInitialize(success) {
                    if (!self.memdb.getCollection("mails")) {
                        self.memdb.addCollection("mails", { unique: ['lastId'] });
                    }
                    if (!self.memdb.getCollection("newMails")) {
                        self.memdb.addCollection("newMails", { unique: ['identifier'] });
                    }
                    if (!self.memdb.getCollection("keepMails")) {
                        self.memdb.addCollection("keepMails", { unique: ['identifier'] });
                    }
                    if (!self.memdb.getCollection("unsubbedMails")) {
                        self.memdb.addCollection("unsubbedMails", { unique: ['identifier'] });
                    }

                    resolve(true);
                }
            }
        );
    }

    deleteDb() {
        this.memdb.deleteDatabase();
    }

    newGroupsSortedView: any;
    unsubGroupsSortedView: any;
    keepGroupsSortedView: any;


    async init() {
        this.memdb_mails = this.memdb.getCollection("mails");
        this.memdb_newMails = this.memdb.getCollection("newMails");
        this.memdb_keepMails = this.memdb.getCollection("keepMails");
        this.memdb_unsubbedMails = this.memdb.getCollection("unsubbedMails");

        this.newGroupsSortedView = this.memdb_newMails.addDynamicView('newGroups');
        this.newGroupsSortedView.applySimpleSort('identifier');
        this._newGroupsObservable.next(this.newGroupsSortedView.data());

        this.unsubGroupsSortedView = this.memdb_unsubbedMails.addDynamicView('unsubGroups');
        this.unsubGroupsSortedView.applySimpleSort('identifier');
        this._unsubbedGroupsObservable.next(this.unsubGroupsSortedView.data());

        this.keepGroupsSortedView = this.memdb_keepMails.addDynamicView('keepGroups');
        this.keepGroupsSortedView.applySimpleSort('identifier');
        this._keepGroupsObservable.next(this.keepGroupsSortedView.data());
    }

    //adds an email object to storage and observable
    add(fetchedMailObject) {
        var msg = new Message();
        msg.lastId = fetchedMailObject.uid;

        var mailFrom = fetchedMailObject['body[header.fields (from)]'];
        if (mailFrom !== undefined && mailFrom.length > 6) {
            msg.from = mimeWordsDecode(mailFrom.substr(6)).replace(/"/g, '');
        } else {
            console.log('header not found or invalid for <from>');
            console.log(fetchedMailObject);
        }

        var mailDate = fetchedMailObject['body[header.fields (date)]'];
        if (mailDate !== undefined && mailDate.length > 6) {
            msg.lastDate = Date.parse(mailDate.substr(6));
        } else {
            console.log('header not found or invalid for <date>');
            console.log(fetchedMailObject)
        }

        var mailSubject = fetchedMailObject['body[header.fields (subject)]'];
        if (mailSubject !== undefined && mailSubject.length > 9) {
            msg.lastSubject = mimeWordsDecode(mailSubject.substr(9));
        } else {
            //console.log('header not found or invalid for <subject>');
            //console.log(fetchedMailObject)
        }

        var mailUnsubscribeInfo = fetchedMailObject['body[header.fields (list-unsubscribe)]'];
        if (mailUnsubscribeInfo !== undefined && mailUnsubscribeInfo.length > 18) {
            msg.unsubscribeEmail = mimeWordsDecode(mailUnsubscribeInfo.substr(18));
        } else {
            //console.log('header not found or invalid for <list-unsubscribe>');
            //console.log(fetchedMailObject)
        }

        //if no unscribe info here, add mail to ignore list and return
        if (msg.unsubscribeEmail === undefined) {
            msg.status = 4;
            this.memdb_mails.insert(msg);
            return;
        }

        msg.ignoreIds = [];

        //hostname as key for 1st level
        var hostname = extractHostname(msg.from);
        msg.hostname = hostname;

        //get mail with id
        let mailExists = this.memdb_mails.by('lastId', msg.lastId);

        //if mail id exists, skip
        if (mailExists === undefined) {
            var keyCount = this.memdb_mails.find({ hostname: msg.hostname, from: msg.from }, true); // true means firstOnly
            if (keyCount[0]) {
                keyCount = keyCount[0];
            } else {
                keyCount = undefined;
            }

            if (keyCount === undefined) {
                this.memdb_mails.insert(msg);
                this.addMsgGroup(msg,0);
            } else {
                keyCount.ignoreIds.push(msg.lastId);
                this.memdb_mails.update(keyCount);
            }
        }
    }

    private getMemDBTable(status: number) {
        switch (status) {
            case 1:
                return this.memdb_unsubbedMails;
            case 2:
                return this.memdb_keepMails;
            default:
                return this.memdb_newMails;
        }
    }

    private updateView(status: number) {
        switch (status) {
            case 1:
                this._unsubbedGroupsObservable.next(this.unsubGroupsSortedView.data());
            case 2:
                this._keepGroupsObservable.next(this.keepGroupsSortedView.data());
            default:
                this._newGroupsObservable.next(this.newGroupsSortedView.data());
        }
    }


    //add msg to grouping
    private addMsgGroup(msg: Message, source: number = 0, updateObervables = true) {

        //Set key group index, here 1st letter
        var groupIndex = msg.hostname.substring(0, 1).toUpperCase();

        var tt = this.getMemDBTable(source).findOne({ identifier: groupIndex });
        if (tt == null) {
            var mg: MessageGroup = new MessageGroup();
            mg.hostname = msg.hostname;
            mg.key = msg.hostname;
            mg.name = extractMailFromName(msg.from);
            mg.estimatedMessageCount = 1;
            var dg: DisplayGroup = new DisplayGroup();
            dg.identifier = groupIndex;
            dg.messagegroups = [mg];
            dg.displayName = groupIndex;
            this.getMemDBTable(source).insert(dg);
        } else {
            var mgHost = tt.messagegroups.find(x => x.key === msg.hostname);
            if (mgHost === undefined) {
                var mg: MessageGroup = new MessageGroup();
                mg.key = msg.hostname;
                mg.hostname = msg.hostname;
                mg.name = extractMailFromName(msg.from);
                mg.estimatedMessageCount = 1;
                tt.messagegroups.push(mg);
                tt.messagegroups.sort((a,b) => (a.hostname > b.hostname) ? 1 : ((b.hostname > a.hostname) ? -1 : 0));
            } else {
                mgHost.estimatedMessageCount = mgHost.estimatedMessageCount + 1;
            }
        }

        if (updateObervables) {
            this.updateView(source);
        }

     
    }


    //remove msg from grouping
    private removeMsgGroup(msg: Message, source: number = 0, msgId: number = -1) {
        //Set key group index, here 1st letter
        var groupIndex = msg.hostname.substring(0, 1).toUpperCase();
        var dg = this.getMemDBTable(source).by('identifier', groupIndex);
        if (dg != null) {
            var memTable = this.getMemDBTable(source);
            //if only one, remove full group
            if (dg.messagegroups.length == 1) {
                memTable.findAndRemove({ 'identifier': groupIndex });
                this.updateView(source);
            } else {
                dg.messagegroups = dg.messagegroups.filter(function (el) { return el.hostname !== msg.hostname });
                memTable.update(dg);
            }
        }
    }



    keep(msgId: string) {
        let msg = this.memdb_mails.by('lastId', msgId);
        if (msg !== undefined) {
            this.addMsgGroup(msg, 2);
            this.removeMsgGroup(msg, msg.status);
            msg.status = 2;
        }
    }

    //delete a message from group and set state to delete
    delete(msgId: string) {
        let msg = this.memdb_mails.by('lastId', msgId);
        if (msg !== undefined) {
            //remove from grouping
            this.removeMsgGroup(msg, msg.status);
            msg.status = 3;
        }
    }


    unsubscribe(msgId: string) {
        let msg = this.memdb_mails.by('lastId', msgId);
        if (msg !== undefined) {
            this.addMsgGroup(msg, 1);
            this.removeMsgGroup(msg, msg.status);
            msg.status = 1;
        }
    }



    getMailsByHostname(hostname) {
        return this.memdb_mails.find({ hostname: hostname });
    }

    getMailsWithHostnameAndStatus(hostname, status) {
        return this.memdb_mails.find({ hostname: hostname, status: status });
    }

    getMsgCountWithStatus(status) {
        return this.memdb_mails.count({ status: status });
    }

    getMsgById(msgId: number) {
        return this.memdb_mails.by('lastId', msgId);
    }

    getMsgCount() {
        return this.memdb_mails.count();
    }

    getProcessedIds() {
        var ids = [];
        this.memdb_mails.mapReduce(
            function (obj) { return { id: obj.lastId, ids: obj.ignoreIds } },
            function (objReduced) {
                for (var i = 0; i < objReduced.length; i++) {
                    ids = ids.concat(objReduced[i].ids);
                    ids.push(objReduced[i].id);
                }

                return ids.length;
            });

        return ids;
    }
}





function extractHostname(url) {
    var url = url.toLowerCase(); // lower case the url/domain
    var iStart = url.lastIndexOf('<');
    var iEnd = url.lastIndexOf('>');

    if (iStart > -1 && iEnd > -1) {
        url = url.substr(iStart + 1, iEnd - iStart - 1);
    }

    var at = url.lastIndexOf('@');
    if (at != -1) {
        var domain = url.substr(at + 1);
        //get only root domain
        var extractdomain = parseDomain(domain);
        if (extractdomain && extractdomain.domain && extractdomain.tld) {
            return extractdomain.domain + '.' + extractdomain.tld; // return domain with subdomain chopped off
        } else {
            return domain; // got some null values while parsing, so just return full domain
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