import { Component, OnInit } from '@angular/core';


import { DbService, UserService } from '../../shared';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  constructor(private _dbService:DbService, private _userService:UserService) { }

  ngOnInit() {
  }

  resetDatabase() {
    var self = this;
    this._dbService.delete().then(() => {
        self._dbService.create();
        alert('database recreated. close and re-open extension');
    }).catch(error => {
        alert(error);
    });
  }

  resetAll() {
    var self = this;
    this._dbService.delete().then(() => {
        self._dbService.create();
        return self._userService.reset();
    }).then(() => {
        //reset successfully done
        alert('all data reset. close and re-open extension');
    }).catch(error => {
        alert(error);
    });
  }
}
