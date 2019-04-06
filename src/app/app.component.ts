import { Component, OnInit } from '@angular/core';
import { UserService, UIService } from './shared';
import { Router } from '@angular/router';
import { Angulartics2GoogleAnalytics } from 'angulartics2/ga';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

    constructor(
        private _userService: UserService,
        private _uiService:UIService,
        private router: Router,
        angulartics2GoogleAnalytics: Angulartics2GoogleAnalytics) {
            angulartics2GoogleAnalytics.startTracking();
        }

    async ngOnInit() {
        try {
            //create init user 
            var userConfig = this._userService.createOrLoadConfig();
            if (userConfig.firsttime) {
                this.router.navigateByUrl('/register');
            } else {
                this.router.navigateByUrl('/');
            }
        } catch (error) {
            console.error(error);
            this._uiService.showAlert(error);
        }
    }
}
