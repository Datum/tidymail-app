import { Injectable} from '@angular/core';

import Dexie from 'dexie';
import { BehaviorSubject, Observable } from 'rxjs';

import { Message } from '../models';

@Injectable()
export class DbService {


    private _newMesssage: Message;
    private _newMessageObervable: BehaviorSubject<Message> = new BehaviorSubject(null);

    private _undhandledMessages: Message[] = [];
    private _undhandledMessagesObervable: BehaviorSubject<Message[]> = new BehaviorSubject([]);

    private _keepMessages: Message[] = [];
    private _keepMessagesObervable: BehaviorSubject<Message[]> = new BehaviorSubject([]);

    get newMessage(): Observable<Message> { return this._newMessageObervable.asObservable() }
    get undhandledMails(): Observable<Message[]> { return this._undhandledMessagesObervable.asObservable() }
    get keepMails(): Observable<Message[]> { return this._keepMessagesObervable.asObservable() }

    

    constructor() {}

    db: any;
    name: string;

    create(name = "DatumUnsubscriberDatabase") {
        //create database
        this.db = new Dexie(name);

        //create table with index fields
        this.db.version(1).stores({
            mails: 'id,from,subject,threadId,unread,unsubscribeUrl,internalDate,hostname,status'
        });
    }


    delete() {
        return this.db.delete();
    }

    async init() {
       this._undhandledMessages = await this.filterEquals("status",0).toArray();
       this._undhandledMessagesObervable.next(this._undhandledMessages);

       this._keepMessages = await this.filterEquals("status",2).toArray();
       this._keepMessagesObervable.next(this._keepMessages);
    }

    addRange(mails) {
        mails.forEach(element => {
            var p = new Message();
            p.id = element.id;
            p.subject = "TEst";
            this._undhandledMessages.push(p);
            this._undhandledMessagesObervable.next(this._undhandledMessages);
        });
    }

    async add(msg, updateObservable = false) {
        let mailExists = await this.db.mails.get(msg.id);
        if(mailExists === undefined) {
            await this.db.mails.add(msg);
            this._undhandledMessages.push(msg);
            if(updateObservable) {
                this._undhandledMessagesObervable.next(this._undhandledMessages);
            }
        }
    }

    keep(msgId:string) {
        this.db.mails.update(msgId, { status: 2 });
    }

    refresh() {
        this._undhandledMessagesObervable.next(this._undhandledMessages);
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





