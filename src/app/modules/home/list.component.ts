import { Input, Component, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { DisplayGroup, MessageGroup } from '../../shared/models';
import { DbService, UserService, UserConfig, ImapService } from '../../shared';
import { Observable } from 'rxjs';

@Component({
    selector: 'grouped-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss']
})
// tslint:disable:variable-name
export class ListComponent {
    @Input() groups: Observable<DisplayGroup[]>;
    @Input() status: number;

    @Output() onDeleteMsg = new EventEmitter<string>();
    @Output() onKeepMsg = new EventEmitter<string>();
    @Output() onUnsubscribeMsg = new EventEmitter<string>();

    @Output() onDeleteDomain = new EventEmitter<string>();
    @Output() onKeepMsgDomain = new EventEmitter<string>();
    @Output() onUnsubscribeDomain = new EventEmitter<string>();


    constructor(private _dbService: DbService, private _imapService: ImapService) {
        
     }



    //open/close group and reload messages if needed
    async toogleGroup(m, event) {
        var self = this;

        //toogle collpanse
        m.isCollapsed = !m.isCollapsed
        //load msg if needed
        if (!m.isCollapsed) {
            if (m.messages.length == 0) {
                //load messages
                m.messages = await this._dbService.getMailsWithHostnameAndStatus(m.hostname, self.status);
                m.messages.forEach(element => {
                    element.size = bytesToSize(element.size);
                });
            }
        }
    }

    async keep(mg, id) {
        this.onKeepMsg.emit(id);
        mg.isCollapsed = true;
        mg.messages.length = 0;
    }

    async unsubscribe(mg, id) {
        this.onUnsubscribeMsg.emit(id);
        mg.isCollapsed = true;
        mg.messages.length = 0;
    }

    async delete(mg, id) {
        this.onDeleteMsg.emit(id);
        mg.isCollapsed = true;
        mg.messages.length = 0;
    }

    async deleteAll(mg, event) {
        event.stopPropagation();
        this.onDeleteDomain.emit(mg.hostname);
    }

    async keepAll(mg, event) {
        event.stopPropagation();
        this.onKeepMsgDomain.emit(mg.hostname);
    }

    async unsubscribeAll(mg, event) {
        event.stopPropagation();
        this.onUnsubscribeDomain.emit(mg.hostname);
    }
}




function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    var i = parseInt((Math.floor(Math.log(bytes) / Math.log(1024)).toString()));
    return parseFloat((bytes / Math.pow(1024, i)).toString()).toFixed(2) + ' ' + sizes[i];
 };