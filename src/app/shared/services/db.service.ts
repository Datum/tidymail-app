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
import { environment } from 'src/environments/environment.prod';



@Injectable()
export class DbService {


    private _newGroupedByHostObservable: BehaviorSubject<any[]> = new BehaviorSubject([]);
    get newGroupedByHost(): Observable<any[]> { return this._newGroupedByHostObservable.asObservable() }

    private _keepGroupedByHostObservable: BehaviorSubject<any[]> = new BehaviorSubject([]);
    get keepGroupedByHost(): Observable<any[]> { return this._keepGroupedByHostObservable.asObservable() }

    private _unsubGroupedByHostObservable: BehaviorSubject<any[]> = new BehaviorSubject([]);
    get unsubGroupedByHost(): Observable<any[]> { return this._unsubGroupedByHostObservable.asObservable() }
    

    constructor() { }

    memdb: any;
    memdb_mails: any;
    memdb_indexedAdapter: any;

    create(name = "tidymail.db") {
        var self = this;

        return new Promise<boolean>(
            (resolve, reject) => {

                self.memdb_indexedAdapter = new lokiIndexedAdpater("tidymail.db");
                self.memdb = new loki("tidymail.db", {
                    adapter: self.memdb_indexedAdapter,
                    autoload: true,
                    autoloadCallback: databaseInitialize,
                    autosave: true,
                    autosaveInterval: 4000
                });

                function databaseInitialize() {
                    if (!self.memdb.getCollection("mails")) {
                        self.memdb.addCollection("mails", { unique: ['lastId'] });
                    }

                    if (!self.memdb.getCollection("mails")) {
                        reject(false);
                    }

                    resolve(true);
                }
            }
        );
    }

    importJSON(serialzedDbJSON) {
        this.memdb.loadJSON(serialzedDbJSON);
        this.memdb.saveDatabase();
    }

    importObject(serialzedDbObject) {
        this.memdb.loadJSONObject(serialzedDbObject);
        this.memdb.saveDatabase();
    }

    serialize() {
        return this.memdb.serialize();
    }

    deleteDb() {
        var self = this;
        return new Promise<boolean>(
            (resolve, reject) => {
                this.memdb.close();
                this.memdb.deleteDatabase(function (res) {
                    res.success ? resolve(true) : reject(false);
                });
            }
        );

    }

    newGroupsSortedView: any;
    unsubGroupsSortedView: any;
    keepGroupsSortedView: any;

    async init() {
        var self = this;
        this.memdb_mails = this.memdb.getCollection("mails");

        this.newGroupsSortedView = this.memdb_mails.addDynamicView('newMails');
        this.newGroupsSortedView.applyFind({ 'status': 0 });
        this.newGroupsSortedView.applySimpleSort('hostname');

        this.unsubGroupsSortedView = this.memdb_mails.addDynamicView('unsubMails');
        this.unsubGroupsSortedView.applyFind({ 'status': 1 });
        this.unsubGroupsSortedView.applySimpleSort('hostname');

        this.keepGroupsSortedView = this.memdb_mails.addDynamicView('keepMails');
        this.keepGroupsSortedView.applyFind({ 'status': 2 });
        this.keepGroupsSortedView.applySimpleSort('hostname');

        this.updateViews()
    }

    //adds an email object to storage and observable
    add(fetchedMailObject, newDate, updateObservable = false) {
        var msg = new Message();
        msg.lastId = fetchedMailObject.uid;
        msg.size = fetchedMailObject['rfc822.size'];
        msg.readCount = fetchedMailObject['flags'].findIndex(v => v.includes("Seen")) > -1 ? 1 : 0;

        var mailFrom = fetchedMailObject['body[header.fields (from)]'];
        if (mailFrom !== undefined && mailFrom.length > 6) {
            msg.from = mimeWordsDecode(mailFrom.substr(6)).replace(/"/g, '');
        } else {
            if (!environment.production) console.log('header not found or invalid for <from>');
            if (!environment.production) console.log(fetchedMailObject);
        }

        var mailDate = fetchedMailObject['body[header.fields (date)]'];
        if (mailDate !== undefined && mailDate.length > 6) {
            msg.lastDate = Date.parse(mailDate.substr(6));
        } else {
            if (!environment.production) console.log('header not found or invalid for <date>');
            if (!environment.production) console.log(fetchedMailObject)
        }

        var mailSubject = fetchedMailObject['body[header.fields (subject)]'];
        if (mailSubject !== undefined && mailSubject.length > 9) {
            msg.lastSubject = mimeWordsDecode(mailSubject.substr(9));
        } else {
            if (!environment.production) console.log('header not found or invalid for <subject>');
            if (!environment.production) console.log(fetchedMailObject)
        }

        var mailUnsubscribeInfo = fetchedMailObject['body[header.fields (list-unsubscribe)]'];
        if (mailUnsubscribeInfo !== undefined && mailUnsubscribeInfo.length > 18) {
            msg.unsubscribeEmail = mimeWordsDecode(mailUnsubscribeInfo.substr(18));
        } else {
            if (!environment.production) console.log('header not found or invalid for <list-unsubscribe>');
            if (!environment.production) console.log(fetchedMailObject)
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
                //if msg is older than value in config, move directly to unsubscribed
                if (msg.lastDate !== undefined) {
                    var d = new Date(msg.lastDate);
                    if (d < newDate) {
                        msg.status = 1
                    }
                }

                this.memdb_mails.insert(msg);
                //this.addMsgGroup(msg, msg.status, updateObservable);
            } else {
                //add id to newsletter
                keyCount.ignoreIds.push(msg.lastId);
                //update total size
                keyCount.size = keyCount.size + msg.size;
                if(msg.readCount == 1) {
                    keyCount.readCount++;
                }
                //update object
                this.memdb_mails.update(keyCount);
            }
        }
    }

    public updateViews() {
        this.updateView(0);
        this.updateView(1);
        this.updateView(2);
    }

    private createGroupView(dataToTransform) {
        var data = dataToTransform.mapReduce(function (o) {
            return {
                groupIndex: o.hostname.substr(0, 1).toUpperCase(),
                hostname: o.hostname,
                from: o.from,
                totalMails: o.ignoreIds.length + 1,
                readCount: o.readCount,
                size: o.size,
                messages: [],
                isCollapsed: true
            }
        }, function (mails) {
            var groupedIds = [];
            var host = ''
            mails.forEach(element => {
                if (host == element.hostname) {
                    groupedIds[groupedIds.length - 1].count++;
                    groupedIds[groupedIds.length - 1].totalMails += element.totalMails;
                    groupedIds[groupedIds.length - 1].readCount += element.readCount;
                    groupedIds[groupedIds.length - 1].size += element.size;
                } else {
                    element.count = 1;
                    groupedIds.push(element);
                }
                host = element.hostname;
            });
            return groupedIds;
        });

        return data;
    }

    public updateView(status: number) {
        switch (status) {
            case 1:
                this._unsubGroupedByHostObservable.next(this.createGroupView(this.unsubGroupsSortedView));
                break;
            case 2:
                this._keepGroupedByHostObservable.next(this.createGroupView(this.keepGroupsSortedView));
                break;
            default:
                this._newGroupedByHostObservable.next(this.createGroupView(this.newGroupsSortedView));
                break;
        }
    }

    keep(msgId: string) {
        let msg = this.memdb_mails.by('lastId', msgId);
        if (msg !== undefined) {
            msg.status = 2;
            this.memdb_mails.update(msg);
            this.updateViews();
        }
    }

    //delete a message from group and set state to delete
    delete(msgId: string) {
        let msg = this.memdb_mails.by('lastId', msgId);
        if (msg !== undefined) {
            msg.status = 3;
            this.memdb_mails.update(msg);
            this.updateViews();
        }
    }

    unsubscribe(msgId: string) {
        let msg = this.memdb_mails.by('lastId', msgId);
        if (msg !== undefined) {
            msg.status = 1;
            this.memdb_mails.update(msg);
            this.updateViews();
        }
    }

    getMailsByHostname(hostname) {
        return this.memdb_mails.find({ hostname: hostname });
    }

    getMsgCounts() {
        return {
            newCount: this.memdb_mails.count({ status: 0 }),
            keepCount: this.memdb_mails.count({ status: 2 }),
            unsubCount: this.memdb_mails.count({ status: 1 })
        }
    }

    getMailsWithHostnameAndStatus(hostname, status) {
        return this.memdb_mails.find({ hostname: hostname, status: status });
    }

    getMsgById(msgId: number) {
        return this.memdb_mails.by('lastId', msgId);
    }

    getLastId() {
        var lastId = this.memdb_mails.chain()
            .simplesort('lastId', true)
            .limit(1)
            .data();

        if (lastId.length == 1) {
            return lastId[0].lastId;
        }

        return null;
    }

    getMsgCountWithStatus(status) {
        return this.memdb_mails.count({ status: status });
    }

    getMsgCount() {
        return this.memdb_mails.count();
    }

    getIds() {
        var ids = [];

        function getIds(obj) {
            var ids = [];
            ids.push(obj.lastId);
            if (obj.ignoreIds !== undefined) {
                ids = ids.concat(obj.ignoreIds);
            }
            return ids;
        }

        function concatIds(array) {
            var ids = [];
            var i = array.length >>> 0;
            while (i--) {
                if (array[i] != null) {
                    ids = ids.concat(array[i]);
                }
            }
            return ids;
        }

        return this.memdb_mails.mapReduce(getIds, concatIds);
    }


    //get total size of all active newsletters (new,keep,unsubscribe (but not deleted))
    getTotalSize() {
        return this.memdb_mails.find({'status': { '$ne' : 3 }}).map(msg => (msg.size)).reduce(function(a, b) { return a + b; }, 0);
    }

     //get total size of all active newsletters (new,keep,unsubscribe (but not deleted))
    getTotalReadCount() {
        var totalReadCount = this.memdb_mails.find({'status': { '$ne' : 3 }}).map(msg => (msg.readCount)).reduce(function(a, b) { return a + b; }, 0);
        return totalReadCount;
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