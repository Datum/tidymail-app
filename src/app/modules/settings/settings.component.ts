import { Component, OnInit } from '@angular/core';
import { UserService, UserConfig, DbService, UIService } from 'src/app/shared';
import { Router } from '@angular/router';

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

    ngOnInit() {
        this.userConfig = this._userService.createOrLoadConfig();
    }

    removeAccount() {
        var self = this;
        this._dbService.deleteDb().then(() => {
            self._dbService.create();
            return self._userService.reset();
        }).then(() => {
            self.router.navigateByUrl('/register');
        }).catch(error => {
            alert(error);
        });
    }

    resetDatabase() {
        var self = this;
        this._dbService.deleteDb().then(() => {
            self._dbService.create();
            this._uiService.showAlert("Local database delete.");
        }).catch(error => {
            alert(error);
        });
    }
}
