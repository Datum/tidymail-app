import { Input, Component } from '@angular/core';


import { DisplayGroup } from '../../shared/models';

import { DbService, UserService, UserConfig, GmailService } from '../../shared';


import { MdcSnackbar } from '@angular-mdc/web';

@Component({
    selector: 'grouped-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss']
})
// tslint:disable:variable-name
export class ListComponent {
    @Input() groups: DisplayGroup[];
    @Input() status: number;


    
    constructor(private _dbService:DbService, private snackbar: MdcSnackbar, private _gmailService:GmailService) { }

    
    async keep(id) {
        await this._dbService.keep(id);
    }

    async delete(id) {
        await this._dbService.delete(id);
        await this._gmailService.delete(id);
    }

    async unsubscribe(id) {

        var msg = await this._dbService.exists(id);
        console.log(msg);

        if(msg.unsubscribeEmail !== undefined) {
            await this._gmailService.send(msg.unsubscribeEmail);
            await this._dbService.unsubscribe(id);

            this.snackbar.open('Unsubscription email sent to: ' + msg.unsubscribeEmail);
        } else {
            window.open(msg.unsubscribeUrl);

            await this._dbService.unsubscribe(id);
        }
    }



    async keepAll(hostname,event) {
        event.stopPropagation(); 
        await this._dbService.keepAll(hostname);
    }

    async deleteAll(hostname,event) {
        event.stopPropagation(); 
        var allMessagesToDelete = await this._dbService.filterEqualsIgnoreCase("hostname",hostname).toArray();
        for(var i = 0; i < allMessagesToDelete.length;i++) {
            await this._gmailService.delete(allMessagesToDelete[i].id);
        }

        await this._dbService.deleteAll(hostname);
    }

    async unsubscribeAll(hostname,event) {
        event.stopPropagation(); 
        await this._dbService.unsubscribeAll(hostname);
    }
}



