import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit, NgZone } from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../shared';
import { toTypeScript } from '@angular/compiler';


@Component({
    selector: 'detail',
    templateUrl: './detail.component.html',
    styleUrls: ['./detail.component.scss']
})
// tslint:disable:variable-name
export class DetailComponent implements OnInit {
    constructor(private _dataService: DataService, private _changeDetector: ChangeDetectorRef, private zone: NgZone, private route: ActivatedRoute) { }

  
    activeTab:number = 0;
    messages:any = [];
    domain:string;

    ngOnInit() {
        var self = this;
        this.domain = this.route.snapshot.paramMap.get('id');
        this._dataService.getMessagesForDomain(this.domain).toArray(function(r) {
            self.messages = r;
            self._changeDetector.detectChanges();
        });
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
