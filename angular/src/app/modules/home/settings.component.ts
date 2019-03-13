import { Component, OnInit } from '@angular/core';


import { DataService } from '../../shared';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  constructor(private _dataService: DataService) { }

  ngOnInit() {
  }

  resetDatabase() {
    this._dataService.resetDatabase().then(() => {
        this._dataService.createDatabase();
        alert('database recreated. close and re-open extension');
    }).catch(error => {
        alert(error);
    });
  }

  resetAll() {
    this._dataService.resetDatabase().then(() => {
        this._dataService.createDatabase();
        chrome.storage.local.remove(["config"], function() {
            alert('all data removed. close and re-open extension');
        });
    }).catch(error => {
        alert(error);
    });
  }
}
