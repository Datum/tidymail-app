import { Injectable } from '@angular/core';

import Dexie from 'dexie';
import { BehaviorSubject, Observable } from 'rxjs';

import { Message, MessageGroup } from '../models';

@Injectable()
export class DbService {


    private _newMesssage: Message;
    private _newMessageObervable: BehaviorSubject<Message> = new BehaviorSubject(null);

    private _undhandledMessages: Message[] = [];
    private _undhandledMessagesObervable: BehaviorSubject<Message[]> = new BehaviorSubject([]);

    private _keepMessages: Message[] = [];
    private _keepMessagesObervable: BehaviorSubject<Message[]> = new BehaviorSubject([]);

    private _unsubMessages: Message[] = [];
    private _unsubMessagesObervable: BehaviorSubject<Message[]> = new BehaviorSubject([]);

    get newMessage(): Observable<Message> { return this._newMessageObervable.asObservable() }
    get undhandledMails(): Observable<Message[]> { return this._undhandledMessagesObervable.asObservable() }
    get keepMails(): Observable<Message[]> { return this._keepMessagesObervable.asObservable() }
    get unsubpMails(): Observable<Message[]> { return this._unsubMessagesObervable.asObservable() }


    private _newMessageGroups: MessageGroup[];
    private _newMessageGroupsObservable: BehaviorSubject<MessageGroup[]> = new BehaviorSubject([]);

    get newM(): Observable<MessageGroup[]> { return this._newMessageGroupsObservable.asObservable() }



    constructor() { }

    db: any;
    name: string;

    create(name = "DatumUnsubscriberDatabase") {
        //create database
        this.db = new Dexie(name);

        //create table with index fields
        this.db.version(1).stores({
            mails: 'id,from,subject,threadId,unread,unsubscribeUrl,internalDate,hostname,status',
            mailgroups: '++id,hostname,from,*ids,status',
            messageGroups: '++id, hostname'
        });

        /*
        MEssageGRoups (google.com, datum.org)
        Messages (from)
        */
    }

    deleteDb() {
        return this.db.delete();
    }

    async init() {
        this._undhandledMessages = await this.filterEquals("status", 0).toArray();
        console.log(this._undhandledMessages.length);
        this._undhandledMessagesObervable.next(this._undhandledMessages);

        this._keepMessages = await this.filterEquals("status", 2).toArray();
        this._keepMessagesObervable.next(this._keepMessages);

        this._unsubMessages = await this.filterEquals("status", 1).toArray();
        this._unsubMessagesObervable.next(this._unsubMessages);

        this._newMessageGroups = await this.db.mailgroups.where("status").equals(0).toArray();
        this._newMessageGroupsObservable.next(this._newMessageGroups);
    }

    addRange(mails) {
        mails.forEach(element => {
            var p = new Message();
            p.id = element.id;
            this._undhandledMessages.push(p);
            this._undhandledMessagesObervable.next(this._undhandledMessages);
        });
    }

    exists(msgId: string) {
        return this.db.mails.get(msgId);
    }

    async existsFrom(from: string) {
        var existsWithFrom = await this.filterEqualsIgnoreCase("from", from).toArray();
        return existsWithFrom.length > 0;
    }


    /*
    async add(msg: Message, updateObservable = false) {
        
        let mailExists = await this.db.mails.get(msg.id);
        if (mailExists === undefined) {
            await this.db.mails.add(msg);
        }

    
        var idList = [];
        idList.push(msg.id);

        let mailGroupExists = await this.db.mailgroups.where('hostname').equals(msg.hostname).first();
        if (mailGroupExists === undefined) {
            console.log('new');
            await this.db.mailgroups.add({ hostname: msg.hostname, from: msg.from, ids: idList, status : 0 });
        } else {
            if (mailGroupExists.from == msg.from) {
                console.log('exists');
                mailGroupExists.ids = mailGroupExists.ids.concat(idList);
                await this.db.mailgroups.update(mailGroupExists.id, { ids: mailGroupExists.ids });
            } else {
                console.log('new from');
                await this.db.mailgroups.add({ hostname: msg.hostname, from: msg.from, ids: idList, status : 0 });
            }
        }

        if(updateObservable) {
            this._newMessageGroups = await this.db.mailgroups.where("status").equals(0).toArray();
            this._newMessageGroupsObservable.next(this._newMessageGroups);
        }
    }
    */


   async add(msg, updateObservable = false) {
    let mailExists = await this.db.mails.get(msg.id);
    if(mailExists === undefined) {
        await this.db.mails.add(msg);
        //if not ignored
        if(msg.status != 4 && msg.status != 1) {
            this._undhandledMessages.push(msg);
        }

        if(msg.status == 1) {
            this._unsubMessages.push(msg);
        }

        if(updateObservable) {
            this._undhandledMessagesObervable.next(this._undhandledMessages);
            this._unsubMessagesObervable.next(this._unsubMessages);
        }
    }
}


    delete(msgId: string) {
        var msg = this._undhandledMessages.filter(function (el) { return el.id == msgId; });
        this._undhandledMessages = this._undhandledMessages.filter(function (el) { return el.id != msgId; });
        this.db.mails.update(msgId, { status: 3 });
        this.refresh();
    }

    keep(msgId: string) {
        var msg = this._undhandledMessages.filter(function (el) { return el.id == msgId; });
        this._undhandledMessages = this._undhandledMessages.filter(function (el) { return el.id != msgId; });
        this._keepMessages.push(msg[0]);
        this.db.mails.update(msgId, { status: 2 });
        this.refresh();
    }

    unsubscribe(msgId: string) {
        var msg = this._undhandledMessages.filter(function (el) { return el.id == msgId; });
        this._undhandledMessages = this._undhandledMessages.filter(function (el) { return el.id != msgId; });
        this._unsubMessages.push(msg[0]);
        this.db.mails.update(msgId, { status: 1 });
        this.refresh();
    }

    async deleteAll(hostname: string) {
        var allMessagesToDelete = await this.filterEqualsIgnoreCase("hostname", hostname).toArray();
        allMessagesToDelete.forEach(async element => {
            if(element.status = 0) {
                await this.db.mails.update(element.id, { status: 3 });
            }
           
        });

        this.init();
    }

    async keepAll(hostname: string) {
        var allMessagesToKeep = await this.filterEqualsIgnoreCase("hostname", hostname).toArray();
        allMessagesToKeep.forEach(async element => {
            if(element.status = 0) {
                await this.db.mails.update(element.id, { status: 2 });
            }
        });

        this.init();
    }

    async unsubscribeAll(hostname: string) {
        var allMessagesToUnsubscribe = await this.filterEqualsIgnoreCase("hostname", hostname).toArray();
        allMessagesToUnsubscribe.forEach(async element => {
            if(element.status = 0) {
                await this.db.mails.update(element.id, { status: 1 });
            }
        });

        this.init();
    }

    refresh() {
        this._undhandledMessagesObervable.next(this._undhandledMessages);
        this._keepMessagesObervable.next(this._keepMessages);
        this._unsubMessagesObervable.next(this._unsubMessages);
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

    /*
    createDatabase() {
        this.db = new Dexie('DatumUnsubscriberDatabase');
        this.db.version(1).stores({
            mails: 'id,from,subject,threadId,unread,unsubscribeUrl,internalDate,hostname,status'
        });
    }
    */
}





