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
            mails: 'id,from,subject,threadId,unread,unsubscribeUrl,internalDate,hostname,status,unsubscribeDate,ignoredCount',
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

    exists(msgId: number) {
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

    async updateIgnoreCount(from) {
        var mails = await this.filterEqualsIgnoreCase("from", from).toArray();
        console.log(mails[0].id);
        if (mails.length == 0 || mails.length > 1) {
            console.log('invalid mail length!');
            return;
        }

        await this.db.mails.update(mails[0].id, { ignoredCount: (mails[0].ignoredCount + 1) });
    }


    async addIgnoreMail(msg) {

        var mails = await this.filterEqualsIgnoreCase("from", msg.from).toArray();
        if (mails.length == 0 || mails.length > 1) {
            console.log('invalid mail length!');
            return;
        }

        var msgExists = mails[0];

        var actualIgnoreCount = msgExists.ignoredCount;

        //update ignore count
        await this.db.mails.update(msgExists.id, { ignoredCount: (actualIgnoreCount + 1) });

        //set ignore
        msg.status = 4;

        //add to db
        await this.db.mails.add(msg);
    }



    //adds an email object to storage
    async add(msg, updateObservable = false) {

        //get mail with id
        let mailExists = await this.db.mails.get(msg.id);

        //if mail id exists, skip
        if (mailExists === undefined) {

            //check if mail exists with given "from" that's not in ignore state
            var mails = await this.filterEqualsIgnoreCase("from", msg.from).filter(function (msg) {
                return msg.status !== 4;
            }).toArray();

            console.log('exists with from: ' + mails);

            //if mail exists with given from, add the mail as ignore and update count
            if (mails.length == 1) {
                console.log('from already exists, just add ignore count');

                //add mail with ignore state
                msg.status = 4;
                await this.db.mails.add(msg);


                console.log(mails[0].id);

                //update ignore count
                await this.db.mails.update(mails[0].id, { ignoredCount: (mails[0].ignoredCount + 1) });

            } else {
                //add default
                await this.db.mails.add(msg);
            }

            //if not ignored
            if (msg.status == 0) {
                this._undhandledMessages.push(msg);
            }

            if (updateObservable) {
                this._undhandledMessagesObervable.next(this._undhandledMessages);
                this._unsubMessagesObervable.next(this._unsubMessages);
            }


        } else {
            console.log('exists');
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
        this.db.mails.update(msgId, { status: 1, unsubscribeDate: Date.now() });
        this.refresh();
    }

    async deleteAll(hostname: string) {
        var allMessagesToDelete = await this.filterEqualsIgnoreCase("hostname", hostname).toArray();
        allMessagesToDelete.forEach(async element => {
            if (element.status == 0) {
                this._undhandledMessages = this._undhandledMessages.filter(function (el) { return el.id != element.id; });
                this.db.mails.update(element.id, { status: 3 });

            }

        });
        this.refresh();
    }

    async keepAll(hostname: string) {
        var allMessagesToKeep = await this.filterEqualsIgnoreCase("hostname", hostname).toArray();
        allMessagesToKeep.forEach(async element => {
            if (element.status == 0) {
                var msg = this._undhandledMessages.filter(function (el) { return el.id == element.id; });
                this._undhandledMessages = this._undhandledMessages.filter(function (el) { return el.id != element.id; });
                this._keepMessages.push(msg[0]);
                this.db.mails.update(element.id, { status: 2 });

            }
        });
        this.refresh();
    }

    async unsubscribeAll(hostname: string) {
        var allMessagesToKeep = await this.filterEqualsIgnoreCase("hostname", hostname).toArray();
        allMessagesToKeep.forEach(async element => {
            if (element.status == 0) {
                var msg = this._undhandledMessages.filter(function (el) { return el.id == element.id; });
                this._undhandledMessages = this._undhandledMessages.filter(function (el) { return el.id != element.id; });
                this._unsubMessages.push(msg[0]);
                this.db.mails.update(element.id, { status: 1, unsubscribeDate: Date.now() });
            }
        });
        this.refresh();
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





