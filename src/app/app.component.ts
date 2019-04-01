import { Component, OnInit } from '@angular/core';
import { UserService, UIService } from './shared';
import { Router } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

    constructor(
        private _userService: UserService,
        private _uiService:UIService,
        private router: Router) { }

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
            this._uiService.showAlert(error);
        }
    }
}
