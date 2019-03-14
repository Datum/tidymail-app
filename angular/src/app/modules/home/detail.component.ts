import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit, NgZone } from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { DbService, GmailService } from '../../shared';
import { toTypeScript } from '@angular/compiler';
import { KeyEventsPlugin } from '@angular/platform-browser/src/dom/events/key_events';
import { ObjectUnsubscribedError } from 'rxjs';
import { refreshDescendantViews } from '@angular/core/src/render3/instructions';


@Component({
    selector: 'detail',
    templateUrl: './detail.component.html',
    styleUrls: ['./detail.component.scss']
})
// tslint:disable:variable-name
export class DetailComponent implements OnInit {
    constructor(private _dbService:DbService, private _gmailService:GmailService, private _changeDetector: ChangeDetectorRef, private zone: NgZone, private route: ActivatedRoute) { }

  
    
    messages:any = [];
    domain:string;
    status:number;

    async ngOnInit() {
        this.domain = this.route.snapshot.paramMap.get('id');
        this.status = parseInt(this.route.snapshot.paramMap.get('status'));
        await this.refresh();
       
    }

    async keep() {
        await asyncForEach(this.messages, async (element) => {
            if(element.isChecked) {
                await this._dbService.keep(element.id);
            }
        });

        await this.refresh();
    }

    async refresh() {
        var self = this;
        this.messages = await this._dbService.filterEqualsIgnoreCase("hostname", this.domain).filter(function (msg) {
            return msg.status === self.status;
        }).toArray();
    }

    async unsubscribe() {
        await asyncForEach(this.messages, async (element) => {
            if(element.isChecked) {
                if(element.unsubscribeUrl !== undefined) {
                    window.open(element.unsubscribeUrl);
                    //alert(element.unsubscribeUrl);
                }
                await this._dbService.unsubscribe(element.id);
            }
        });

        await this.refresh();
    }

    async delete() {
        await asyncForEach(this.messages, async (element) => {
            if(element.isChecked) {
                await this._gmailService.delete(element.id);
                await this._dbService.delete(element.id);
            }
        });

        await this.refresh();
    }
}


async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
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
