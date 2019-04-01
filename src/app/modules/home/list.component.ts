import { Input, Component, ChangeDetectionStrategy } from '@angular/core';
import { DisplayGroup } from '../../shared/models';
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


    loading: boolean = false;
    statusText: string = 'Loading...';


    constructor(private _dbService: DbService, private _imapService: ImapService) { }



    //open/close group and reload messages if needed
    async toogleGroup(m, event) {
        var self = this;

        //toogle collpanse
        m.isCollapsed = !m.isCollapsed

        //load msg if needed
        if (!m.isCollapsed) {
            if (m.messages.length == 0) {
                //load messages
                m.messages = await this._dbService.filterEqualsIgnoreCase("hostname", m.hostname).filter(function (msg) {
                    return msg.status === self.status;
                }).toArray();
            }
        }
    }

    async keep(id) {
        await this._dbService.keep(id);
    }

    async delete(id) {
        await this._dbService.delete(id);

        var deleteIds = [];
        deleteIds.push(id);

        await this._imapService.moveTrash(deleteIds);
    }

    async unsubscribe(id) {
        var msg = await this._dbService.exists(id);

        if (msg.unsubscribeEmail !== undefined) {

            //var result = await this._gmailService.send(msg.unsubscribeEmail);


            await this._dbService.unsubscribe(id);


            //await this._gmailService.delete(result.id);

            //this.snackbar.open('Unsubscription email sent to: ' + msg.unsubscribeEmail + ' and moved to trash.');
        } else {

            //await this._gmailService.unsubscribeUrl(msg.unsubscribeUrl);


            await this._dbService.unsubscribe(id);

            //this.snackbar.open('Unsubscription requested.');
        }
    }



    async keepAll(mg, event) {

        //mg.keepLoading = true;
        //mg.statusText = "Loading...";


        console.log('asdfasdf');

        event.stopPropagation();
        await this._dbService.keepAll(mg);

        //mg.keepLoading = false;;
    }

    async deleteAll(hostname, mg, event) {

        mg.deleteLoading = true;

        mg.statusText = "Loading...";

        event.stopPropagation();

        var allMessagesToDelete = await this._dbService.filterEqualsIgnoreCase("hostname", hostname).toArray();

        await this._imapService.moveTrash(allMessagesToDelete.map(item => item.id));

        /*
        for(var i = 0; i < allMessagesToDelete.length;i++) {
            mg.statusText = 'Delete ' + i + ' of ' + allMessagesToDelete.length;
            await this._gmailService.delete(allMessagesToDelete[i].id);
        }
        */

        await this._dbService.deleteAll(hostname);

        mg.deleteLoading = false;
    }

    async unsubscribeAll(hostname, mg, event) {
        mg.unsubLoading = true;
        mg.statusText = "Loading...";

        event.stopPropagation();

        var allMessagesToUnsubscribe = await this._dbService.filterEqualsIgnoreCase("hostname", hostname).toArray();
        for (var i = 0; i < allMessagesToUnsubscribe.length; i++) {
            mg.statusText = 'Unsubscribe ' + i + ' of ' + allMessagesToUnsubscribe.length;

            if (allMessagesToUnsubscribe[i].unsubscribeEmail !== undefined) {
                //var result = await this._gmailService.send(allMessagesToUnsubscribe[i].unsubscribeEmail);
                //await this._dbService.unsubscribe(id);
                //await this._gmailService.delete(result.id);

                //this.snackbar.open('Unsubscription email sent to: ' + msg.unsubscribeEmail + ' and moved to trash.');
            } else {
                //await this._gmailService.unsubscribeUrl(allMessagesToUnsubscribe[i].unsubscribeUrl);
                //await this._dbService.unsubscribe(id);

                //this.snackbar.open('Unsubscription requested.');
            }
        }


        //this.snackbar.open('Unsubscription requested.');



        //this.snackbar.open('Unsubscription for ' + hostname + ' requested.');

        await this._dbService.unsubscribeAll(hostname);

        mg.unsubLoading = false;
    }
}



