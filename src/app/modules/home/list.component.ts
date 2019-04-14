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

    @Output() onDeleteDomain = new EventEmitter<any>();
    @Output() onKeepDomain = new EventEmitter<any>();
    @Output() onUnsubscribeDomain = new EventEmitter<any>();


    sortExpressions:any = [
        { label: 'Sender',  exp: "current.groupIndex" },
        { label: 'Unread Percentage', exp: "Math.ceil(parseInt((current.readCount / current.totalMails * 100).toString()) / 10) * 10", reverse: false, suffix: ' %'},
        { label: 'Size', exp: "parseInt((Math.ceil(current.size / 500000) * 500000) / 1000000)", reverse:true, prefix: '>', suffix: ' MB' }
    ]
    selectedSortIndex = 0;

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
        this.onDeleteDomain.emit({ hostname: mg.hostname, status: this.status});
    }

    async keepAll(mg, event) {
        event.stopPropagation();
        this.onKeepDomain.emit({ hostname: mg.hostname, status: this.status});
    }

    async unsubscribeAll(mg, event) {
        event.stopPropagation();
        this.onUnsubscribeDomain.emit({ hostname: mg.hostname, status: this.status});
    }
}



