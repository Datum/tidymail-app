import { Injectable } from '@angular/core';

import Dexie from 'dexie';
import { BehaviorSubject, Observable } from 'rxjs';

import { Message, MessageGroup, DisplayGroup } from '../models';

const parseDomain = require('parse-domain');

import {
    mimeWordEncode, mimeWordDecode,
    mimeWordsEncode, mimeWordsDecode
} from 'emailjs-mime-codec';



@Injectable()
export class DbService {

    private _newGroups: DisplayGroup[];
    private _newGroupsObservable: BehaviorSubject<DisplayGroup[]> = new BehaviorSubject([]);
    get newMails(): Observable<DisplayGroup[]> { return this._newGroupsObservable.asObservable() }

    private _keepGroups: DisplayGroup[];
    private _keepGroupsObservable: BehaviorSubject<DisplayGroup[]> = new BehaviorSubject([]);
    get keepMails(): Observable<DisplayGroup[]> { return this._keepGroupsObservable.asObservable() }

    private _unsubbedGroups: DisplayGroup[];
    private _unsubbedGroupsObservable: BehaviorSubject<DisplayGroup[]> = new BehaviorSubject([]);
    get unsubbedMails(): Observable<DisplayGroup[]> { return this._unsubbedGroupsObservable.asObservable() }



    constructor() { }

    db: any;
    name: string;

    create(name = "DatumUnsubscriberDatabase") {
        //create database
        this.db = new Dexie(name);

        //create table with index fields
        this.db.version(1).stores({
            mails: 'lastId, hostname, from, lastSubject,status',
            newMails: 'identifier, displayName, messagegroups',
            keepMails: 'identifier, displayName, messagegroups',
            unsubbedMails: 'identifier, displayName, messagegroups',
        });
    }

    deleteDb() {
        return this.db.delete();
    }

    async init() {
        this._newGroups = await this.db.newMails.toArray();
        this._newGroupsObservable.next(this._newGroups);

        this._unsubbedGroups = await this.db.unsubbedMails.toArray();
        this._unsubbedGroupsObservable.next(this._unsubbedGroups);

        this._keepGroups = await this.db.keepMails.toArray();
        this._keepGroupsObservable.next(this._keepGroups);
    }

    exists(msgId: number) {
        return this.db.mails.get(msgId);
    }

    async existsFrom(from: string) {
        var existsWithFrom = await this.filterEqualsIgnoreCase("from", from).toArray();
        return existsWithFrom.length > 0;
    }

    async updateIgnoreCount(from) {
        var mails = await this.filterEqualsIgnoreCase("from", from).toArray();
        if (mails.length == 0 || mails.length > 1) {
            return;
        }
        await this.db.mails.update(mails[0].id, { ignoredCount: (mails[0].ignoredCount + 1) });
    }


    //adds an email object to storage and observable
    async add(fetchedMailObject) {
        var msg = new Message();
        msg.lastId = fetchedMailObject.uid;
        msg.from = mimeWordsDecode(fetchedMailObject['body[header.fields (from)]'].substr(6)).replace(/"/g, '');
        msg.lastDate = Date.parse(fetchedMailObject['body[header.fields (date)]'].substr(6));
        msg.lastSubject = mimeWordsDecode(fetchedMailObject['body[header.fields (subject)]'].substr(9));
        msg.unsubscribeEmail = mimeWordsDecode(fetchedMailObject['body[header.fields (list-unsubscribe)]'].substr(18));
        //msg.ignoreIds = fetchedMailObject.sameFromIds !== undefined ? fetchedMailObject.sameFromIds : [];
        msg.ignoreIds = [];

        //hostname as key for 1st level
        var hostname = extractHostname(msg.from);
        msg.hostname = hostname;



        //get mail with id
        let mailExists = await this.db.mails.get(msg.lastId);

        //if mail id exists, skip
        if (mailExists === undefined) {
            //add msg itself to db, for ui they will attached on demand (lazy load)
            //Check again for active key, here host + from, because imap search could return wrong results

            var keyCount = await this.db.mails.where('hostname').equalsIgnoreCase(msg.hostname).filter(function (mail) {
                return mail.from === msg.from;
            }).first();

            if (keyCount === undefined) {
                await this.db.mails.add(msg);
                await this.addOrUpdateMsg(msg);
            } else {
                keyCount.ignoreIds.push(msg.lastId);
                await this.db.mails.update(keyCount.lastId, { ignoreIds: keyCount.ignoreIds })
            }
        } else {
            console.log('exists');
        }


    }

    private getGroupEntity(status: number) {
        switch (status) {
            case 1:
                return this.db.unsubbedMails;
            case 2:
                return this.db.keepMails;
            default:
                return this.db.newMails;
        }
    }

    private getGroupObservables(status: number) {
        switch (status) {
            case 1:
                return this._unsubbedGroups;
            case 2:
                return this._keepGroups;
            default:
                return this._newGroups;
        }
    }

    private filterGroupObservables(status: number, filter: string) {
        switch (status) {
            case 1:
                this._unsubbedGroups = this._unsubbedGroups.filter(function (el) { return el.identifier !== filter });
                this._unsubbedGroupsObservable.next(this._unsubbedGroups);
            case 2:
                this._keepGroups = this._keepGroups.filter(function (el) { return el.identifier !== filter });
                this._keepGroupsObservable.next(this._keepGroups);
            default:
                this._newGroups = this._newGroups.filter(function (el) { return el.identifier !== filter });
                this._newGroupsObservable.next(this._newGroups);
        }
    }

    private updateGroupObservables(status: number) {
        switch (status) {
            case 1:
                this._unsubbedGroupsObservable.next(this._unsubbedGroups);
            case 2:
                this._keepGroupsObservable.next(this._keepGroups);
            default:
                this._newGroupsObservable.next(this._newGroups);
        }
    }

    private async addOrUpdateMsg(msg: Message, source: number = 0) {

        //Set key group index, here 1st letter
        var groupIndex = msg.hostname.substring(0, 1).toUpperCase();

        var dbEntity = await this.getGroupEntity(source).where("identifier").equalsIgnoreCase(groupIndex).first();
        var gpOb = this.getGroupObservables(source);

        //check if already exists
        var dgExists = gpOb.find(x => x.identifier === groupIndex);
        if (dgExists === undefined || dbEntity === undefined) {
            //add new group
            var mg: MessageGroup = new MessageGroup();
            mg.hostname = msg.hostname;
            mg.key = msg.hostname;
            mg.name = extractMailFromName(msg.from);
            mg.estimatedMessageCount = 1;
            var dg: DisplayGroup = new DisplayGroup();
            dg.identifier = groupIndex;
            dg.messagegroups = [mg];
            dg.displayName = groupIndex;

            if (dgExists === undefined)
                this.getGroupObservables(source).push(dg);
            if (dbEntity === undefined)
                await this.getGroupEntity(source).add(dg);

            this.getGroupObservables(source).sort((a, b) => (a.identifier > b.identifier) ? 1 : ((b.identifier > a.identifier) ? -1 : 0));
            this.updateGroupObservables(source);
        } else {
            var mgExists = dgExists.messagegroups.find(x => x.key === msg.hostname);
            var mgExistsDb = dbEntity.messagegroups.find(x => x.key === msg.hostname);
            if (mgExists === undefined || mgExistsDb === undefined) {
                var mg: MessageGroup = new MessageGroup();
                mg.key = msg.hostname;
                mg.hostname = msg.hostname;
                mg.name = extractMailFromName(msg.from);
                mg.estimatedMessageCount = 1;

                if (mgExists === undefined)
                    dgExists.messagegroups.push(mg);

                if (mgExistsDb === undefined) {
                    dbEntity.messagegroups.push(mg);
                    await this.getGroupEntity(source).update(groupIndex, { messagegroups: dbEntity.messagegroups });
                }
            } else {
                //check mails exists with same id
                var fromExistsCount = await this.db.mails.where("from").equalsIgnoreCase(msg.from).count();
                if (fromExistsCount == 1) {
                    mgExists.estimatedMessageCount = mgExists.estimatedMessageCount + 1;
                    mgExistsDb.estimatedMessageCount = mgExistsDb.estimatedMessageCount + 1;
                    await this.getGroupEntity(source).update(groupIndex, { messagegroups: dbEntity.messagegroups });
                }
            }
        }
    }


    private async removeMsg(msg: Message, source: number = 0, msgId: number = -1) {

        //Set key group index, here 1st letter
        var groupIndex = msg.hostname.substring(0, 1).toUpperCase();

        var dbEntity = await this.getGroupEntity(source).where("identifier").equalsIgnoreCase(groupIndex).first();
        var gpOb = this.getGroupObservables(source);

        //check if already exists
        var dgExists = gpOb.find(x => x.identifier === groupIndex);
        if (dgExists === undefined || dbEntity === undefined) {
        } else {
            var mgExists = dgExists.messagegroups.find(x => x.key === msg.hostname);
            var mgExistsDb = dbEntity.messagegroups.find(x => x.key === msg.hostname);
            if (mgExists === undefined || mgExistsDb === undefined) {
            } else {
                //if only one, remove all
                if (dgExists.messagegroups.length == 1) {
                    dgExists.messagegroups.length = 0;
                    dbEntity.messagegroups.length = 0;
                } else {
                    //filter
                    dgExists.messagegroups = dgExists.messagegroups.filter(function (el) { return el.hostname !== msg.hostname });
                    dbEntity.messagegroups = dbEntity.messagegroups.filter(function (el) { return el.hostname !== msg.hostname });
                }

                if (dbEntity.messagegroups.length > 0) {
                    await this.getGroupEntity(source).update(groupIndex, { messagegroups: dbEntity.messagegroups });
                } else {
                    await this.getGroupEntity(source).delete(groupIndex);
                    this.filterGroupObservables(source, groupIndex);
                }
            }
        }
    }



    async keep(msgId: string) {
        var msg = await this.db.mails.get(msgId)
        if (msg !== undefined) {
            await this.addOrUpdateMsg(msg, 2);
            await this.removeMsg(msg, msg.status);
            await this.db.mails.update(msgId, { status: 2 });
        }
    }

    async delete(msgId: string) {
        var msg = await this.db.mails.get(msgId)
        if (msg !== undefined) {
            await this.removeMsg(msg, msg.status);
            await this.db.mails.update(msgId, { status: 3 });
        }
    }


    async unsubscribe(msgId: string) {
        var msg = await this.db.mails.get(msgId)
        if (msg !== undefined) {
            await this.addOrUpdateMsg(msg, 1);
            await this.removeMsg(msg, msg.status);
            await this.db.mails.update(msgId, { status: 1 });
        }
    }




    async deleteAll(mg: MessageGroup, statusFilter: number = 0) {
        var allMessagesToDelete = await this.filterEqualsIgnoreCase("hostname", mg.hostname).filter(function (mail) {
            return mail.status === statusFilter;
        }).toArray();

        for (var i = 0; i < allMessagesToDelete.length; i++) {
            await this.delete(allMessagesToDelete[i].lastId);
        }
    }


    async keepAll(mg: MessageGroup, statusFilter: number = 0) {
        var allMessagesToKeep = await this.filterEquals("hostname", mg.hostname).filter(function (mail) {
            return mail.status === statusFilter;
        }).toArray();

        for (var i = 0; i < allMessagesToKeep.length; i++) {
            await this.keep(allMessagesToKeep[i].lastId);
        }
    }


    async unsubscribeAll(mg: MessageGroup, statusFilter: number = 0) {

        var allMessagesToUnsubscribe = await this.filterEqualsIgnoreCase("hostname", mg.hostname).filter(function (mail) {
            return mail.status === statusFilter;
        }).toArray();

        for (var i = 0; i < allMessagesToUnsubscribe.length; i++) {
            await this.unsubscribe(allMessagesToUnsubscribe[i].lastId);
        }
    }



    filterEqualsIgnoreCase(field, value) {
        return this.db.mails.where(field).equalsIgnoreCase(value);
    }

    filterEquals(field, value) {
        return this.db.mails.where(field).equals(value);
    }

    getUniqueKeys(field) {
        return this.db.mails.orderBy(field).uniqueKeys();
    }

    getLastMailId() {
        return this.db.mails.orderBy("internalDate").first();
    }

    async  getProcessedIds() {
        var ids = [];
        await this.db.mails.toCollection().each(function (mail) {
            ids.push(mail.lastId);
            ids = ids.concat(mail.ignoreIds)
        });

        return ids;
    }
}





function extractHostname(url) {
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