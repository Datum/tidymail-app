import { Input, Component } from '@angular/core';


import { DisplayGroup } from '../../shared/models';

import { DbService, UserService, UserConfig } from '../../shared';


@Component({
    selector: 'grouped-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss']
})
// tslint:disable:variable-name
export class ListComponent {
    @Input() groups: DisplayGroup[];
    @Input() status: number;


    
    constructor(private _dbService:DbService) { }

    async keep(id) {
        await this._dbService.keep(id);
    }

    async delete(id) {
        await this._dbService.delete(id);
    }

    async unsubscribe(id) {
        await this._dbService.unsubscribe(id);
    }


    async keepAll(hostname) {
        await this._dbService.keepAll(hostname);
    }

    async deleteAll(hostname) {
        await this._dbService.deleteAll(hostname);
    }

    async unsubscribeAll(hostname) {
        await this._dbService.unsubscribeAll(hostname);
    }
}



