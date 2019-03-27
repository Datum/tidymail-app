import { Component, OnInit } from '@angular/core';
import { DbService, UserService, UserConfig } from '../../shared';
import { MdcSnackbar } from '@angular-mdc/web';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  userConfig:UserConfig = new UserConfig();

  constructor(
    private _dbService:DbService, 
    private _userService:UserService,
    private snackbar: MdcSnackbar,
    private router: Router) { }

  ngOnInit() {
    this.userConfig = this._userService.getConfig();
    this.userConfig.password = "******";
  }

  removeAccount() {
    var self = this;
    this._dbService.deleteDb().then(() => {
        self._dbService.create();
        return self._userService.reset();
    }).then(() => {
        self.router.navigateByUrl('/install');
    }).catch(error => {
        alert(error);
    });
  }

  resetDatabase() {
    var self = this;
    this._dbService.deleteDb().then(() => {
        self._dbService.create();
        this.snackbar.open('Database deleted. Please start new sync.');
    }).catch(error => {
        alert(error);
    });
  }
}
