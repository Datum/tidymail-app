import { Component, OnInit } from '@angular/core';


import { DbService, UserService } from '../../shared';

import { MdcSnackbar } from '@angular-mdc/web';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  constructor(private _dbService:DbService, private _userService:UserService,private snackbar: MdcSnackbar) { }

  ngOnInit() {
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

  resetAll() {
    var self = this;
    this._dbService.deleteDb().then(() => {
        self._dbService.create();
        return self._userService.reset();
    }).then(() => {
        //reset successfully done
        this.snackbar.open('Database and local configuration deleted. Please restart extension.');
    }).catch(error => {
        alert(error);
    });
  }
}
