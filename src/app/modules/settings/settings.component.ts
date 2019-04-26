import { Component, OnInit } from '@angular/core';
import { UserService, UserConfig, DbService, UIService } from 'src/app/shared';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { HttpClient } from '@angular/common/http';


declare var require: any;

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
    constructor(
        private _userService: UserService,
        private _dbService: DbService,
        private _uiService: UIService,
        private _http:HttpClient,
        private router: Router
    ) { }

    urlEncoded:string = '/assets/db.json';
    userConfig: UserConfig;
    version: string = require('../../../../package.json').version;

    ngOnInit() {
        this.userConfig = this._userService.createOrLoadConfig();
    }

    async removeAccount() {
        await this._dbService.deleteDb();
        await this._dbService.create();
        this._userService.reset();
        this.router.navigateByUrl('/register');
    }

    async resetDatabase() {
        await this._dbService.deleteDb();
        await this._dbService.create();
        this._uiService.showAlert("Local database delete.");
    }

    changeAutoSync() {
        this.userConfig.autoSync = !this.userConfig.autoSync;
        this._userService.save(this.userConfig);
    }

    changeDeleteConfirmation() {
        this.userConfig.showDeleteConfirm = !this.userConfig.showDeleteConfirm;
        this._userService.save(this.userConfig);
    }

    async importDatabase() {
        await this._dbService.deleteDb();
        var json = await this._http.get<any>(this.urlEncoded,  { responseType: 'text' as 'json'}).toPromise();
        this._dbService.importJSON(json);
    }

    exportDatabase() {
        var data = this._dbService.serialize();

        var parts = [
            new Blob([data], { type: 'text/plain' }),
            new Uint16Array([33])
        ];


        // Construct a file
        var file = new File(parts, 'db.json', {
            type: "application/json" // optional - default = ''
        });


        //var file = new File(data, "db.json", { type: "text/plain;charset=utf-8" });
        saveAs(file);
        /*
        const blob = new Blob([data], { type: 'text/txt' });
        const url= window.URL.createObjectURL(blob);
        window.open(url);
        */

        //saveAs(data, 'db.json');

    }
}
