import { Component, OnInit } from '@angular/core';
import { UserService, UserConfig, DbService, UIService } from 'src/app/shared';
import { Router } from '@angular/router';

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
        private _uiService:UIService,
        private router: Router
    ) { }

    userConfig: UserConfig;
    version: string = require( '../../../../package.json').version;

    ngOnInit() {
        this.userConfig = this._userService.createOrLoadConfig();
    }

    async removeAccount() {
        this._dbService.deleteDb();
        await this._dbService.create();
        this._userService.reset();
        this.router.navigateByUrl('/register');
    }

    async resetDatabase() {
        this._dbService.deleteDb();
        await this._dbService.create();
        this._uiService.showAlert("Local database delete.");
    }

    changeAutoSync() {
        this._userService.save(this.userConfig);
    }
}
