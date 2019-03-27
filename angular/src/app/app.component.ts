import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit } from '@angular/core';
import { TAB_ID } from './tab-id.injector';
import { DbService, UserService, ImapService } from './shared';
import { Router } from '@angular/router';



@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {


    constructor(
        private _userService: UserService,
        private _imapService: ImapService,
        private router: Router,
        private _dbService: DbService, ) { }
    
    isLoggedIn: boolean = false;
    isLoaded: boolean = false;
    userConfig: any;


    //main app init
    async ngOnInit() {

        var self = this;

        try {

            //create/init database
            this._dbService.create();

            //create init user 
            var userConfig = await this._userService.initConfig();
            this.userConfig = userConfig;

            if (userConfig.firsttime) {
                this.router.navigateByUrl('/install');
            }
        } catch (error) {
            //this.showAlert(error);
        }
    }
}

