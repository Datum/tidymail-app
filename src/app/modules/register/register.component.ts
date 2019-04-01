import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { UserService, ImapService, UIService } from '../../shared';
import { MatHorizontalStepper } from '@angular/material/stepper';
import { Router } from '@angular/router';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
    @ViewChild('stepper') stepper: MatHorizontalStepper
    mailFormGroup: FormGroup;
    passwordFormGroup: FormGroup;
    customImapFormGroup: FormGroup;
    customProvider: boolean = false;
    editable: boolean = true;
    showPrivacy: boolean = false;
    hasError: boolean = false;
    errorMessage: string = "";


    constructor(
        private _formBuilder: FormBuilder,
        private _userService: UserService,
        private _imapService: ImapService,
        private _uiService: UIService,
        private router: Router) { }


    ngOnInit() {
        this.mailFormGroup = this._formBuilder.group({
            email: new FormControl('florian.honegger@gmail.com', Validators.compose([
                Validators.required,
                Validators.pattern('^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+\.[a-z]{2,4}$')
            ]))
        });
        this.passwordFormGroup = this._formBuilder.group({
            password: ['vxvzotexpwqzpzhl', Validators.required],
            rememberMe: ['true']
        });

        this.customImapFormGroup = this._formBuilder.group({
            host: ['', Validators.required],
            username: ['', Validators.required],
            password: ['', Validators.required],
            rememberMe: ['']
        });
    }

    async doRegister(joinReward: boolean) {

        if(joinReward) {
            //call something
            try {
                var res = await this._userService.registerRewards(userConfig.email);
                console.log(res);
            }  catch(error) {
                console.log(error);
            }
        }

        //set config
        var userConfig = this._userService.createOrLoadConfig();
        userConfig.firsttime = false;
        userConfig.hasJoinedRewardProgram = joinReward;
        
        if(this.customProvider) {
            userConfig.imapurl = this.customImapFormGroup.value.host;
            userConfig.imapport = this.customImapFormGroup.value.port;
            userConfig.isGmailProvider = false;
            userConfig.username = this.customImapFormGroup.value.username;
            userConfig.email = this.mailFormGroup.value.email;
        } else {
            userConfig.isGmailProvider = true;
            userConfig.email = this.mailFormGroup.value.email;
            userConfig.username = this.mailFormGroup.value.email;
        }

        //save config
        this._userService.save(userConfig, this.passwordFormGroup.value.password);

        //navigate to home
        this.router.navigateByUrl('/');

    }


    async verifiy() {
        var host = "imap.gmail.com";
        var port = 993;

        //check if custom or gmail
        if (!this.customProvider) {
            try {
                //create imap client
                await this._imapService.create(this.mailFormGroup.value.email, this.passwordFormGroup.value.password, host, port);

                //try to connect
                await this._imapService.open();

                //close after connection without error
                await this._imapService.close();

                //disable editing for previous steps 
                this.editable = false;

                //set stepper to next step
                this.stepper.next();
            } catch (error) {
                //show error as alert
                this._uiService.showAlert(error);
            }
        }

       
    }

}
