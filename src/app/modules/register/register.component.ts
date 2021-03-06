import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { UserService, ImapService, UIService, SmtpService } from '../../shared';
import { MatHorizontalStepper } from '@angular/material/stepper';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

declare var require: any;

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
    verifyFormGroup: FormGroup;
    customProvider: boolean = false;
    verifying: boolean = false;
    editable: boolean = true;
    showPrivacy: boolean = false;
    hasError: boolean = false;
    errorMessage: string = "";
    rewardOnlyRegister: boolean = false;
    imapResponded: boolean = false;
    version: string = require('../../../../package.json').version;
    emailSettingsFinderUrl: string = "https://emailsettings.firetrust.com/settings?q=";
    dnsCheckUrl: string = "https://dns-api.org/AAAA/";


    constructor(
        private _formBuilder: FormBuilder,
        private _userService: UserService,
        private _imapService: ImapService,
        private _uiService: UIService,
        private _route: ActivatedRoute,
        private _smtpService: SmtpService,
        private _router: Router,
        private _http: HttpClient) { }


    ngOnInit() {
        this.mailFormGroup = this._formBuilder.group({
            email: new FormControl('', Validators.compose([
                Validators.required,
                Validators.pattern('^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+\.[a-z]{2,4}$')
            ]))
        });
        this.passwordFormGroup = this._formBuilder.group({
            password: ['', Validators.required],
            rememberMe: ['true']
        });

        this.verifyFormGroup = this._formBuilder.group({
        });

        this.customImapFormGroup = this._formBuilder.group({
            imaphost: ['', Validators.required],
            smtphost: ['', Validators.required],
            username: ['', Validators.required],
            password: ['', Validators.required],
            trashBoxPath: ['Trash'],
            sentBoxPath: ['Sent'],
            rememberMe: ['true']
        });

        //check if reward join only, so user already exists
        var self = this;
        let id = this._route.snapshot.paramMap.get('step');
        if (id == "3") {

            setTimeout(function () {
                self.stepper.reset();

                var userConfig = self._userService.createOrLoadConfig();
                self.rewardOnlyRegister = true;
                self.mailFormGroup.patchValue({ email: userConfig.email });
                self.passwordFormGroup.patchValue({ password: userConfig.password });
                self.editable = false;


                self.stepper.next();
                self.stepper.next();
                self.stepper.next();
            }, 200);
        }
    }

    async mailEntered() {
        var lower = this.mailFormGroup.value.email.toLowerCase();
        if (!lower.endsWith("gmail.com")) {
            this.customProvider = true;
            this.customImapFormGroup.patchValue({
                username: this.mailFormGroup.value.email,
            });
            var chunks = this.mailFormGroup.value.email.split("@");
            var domain = chunks[1];
            //try to get settings with discovery service url, send only domain
            var result = await this._http.get<any>(this.emailSettingsFinderUrl + domain).toPromise();

            //there is a special password set hint for this domain
            if (result.password != "") {
                this._uiService.showAlert("Please set an app specific password. Help cound be found here: " + result.password);
            }

            //check if IMAP exists
            var bFound = false;
            result.settings.forEach(element => {
                if (element.protocol == "IMAP") {
                    this.customImapFormGroup.patchValue({
                        imaphost: element.address + ":" + element.port,
                    });
                    bFound = true;
                }
                if (element.protocol == "SMTP") {
                    this.customImapFormGroup.patchValue({
                        smtphost: element.address + ":" + element.port,
                    });
                }
            });
        }

        this.stepper.next();
    }

    goBack() {
        this.hasError = false;
        this.verifying = false;
        this.stepper.previous();
    }

    async doRegister(joinReward: boolean) {

        if (joinReward) {
            //call something
            try {
                var res = await this._userService.registerRewards(this.mailFormGroup.value.email);
            } catch (error) {
                console.log(error);
            }
        }

        var userConfig = this._userService.createOrLoadConfig();
        if (!this.rewardOnlyRegister) {
            //set config
            userConfig.firsttime = false;
            userConfig.hasJoinedRewardProgram = joinReward;
            userConfig.trashBoxPath = this.customImapFormGroup.value.trashBoxPath;
            userConfig.sentBoxPath = this.customImapFormGroup.value.sentBoxPath;

            if (joinReward)
                userConfig.rewardJoinDate = Date.now();

            if (this.customProvider) {
                userConfig.imapurl = this.customImapFormGroup.value.imaphost.split(':')[0];
                userConfig.imapport = this.customImapFormGroup.value.imaphost.split(':').length > 1 ? this.customImapFormGroup.value.imaphost.split(':')[1] : 993;
                userConfig.smtpurl = this.customImapFormGroup.value.smtphost.split(':')[0];
                userConfig.smtpport = this.customImapFormGroup.value.smtphost.split(':').length > 1 ? this.customImapFormGroup.value.smtphost.split(':')[1] : 465;
                userConfig.isGmailProvider = false;
                userConfig.username = this.customImapFormGroup.value.username;
                userConfig.email = this.mailFormGroup.value.email;
            } else {
                userConfig.isGmailProvider = true;
                userConfig.email = this.mailFormGroup.value.email;
                userConfig.username = this.mailFormGroup.value.email;
            }

            //save config
            this._userService.save(userConfig, this.customProvider ? this.customImapFormGroup.value.password : this.passwordFormGroup.value.password);
        } else {
            userConfig.hasJoinedRewardProgram = joinReward;
            if (joinReward)
                userConfig.rewardJoinDate = Date.now();

            this._userService.save(userConfig);
        }

        //navigate to home
        this._router.navigateByUrl('/');

    }


    async verifiy() {
        if (this.customProvider) {
            this.customImapFormGroup.updateValueAndValidity();
            if (!this.customImapFormGroup.valid) return;
        } else {
            this.passwordFormGroup.updateValueAndValidity();
            if (!this.passwordFormGroup.valid) return;
        }
        var imaphost = this.customProvider ? this.customImapFormGroup.value.imaphost.split(':')[0] : "imap.gmail.com";
        var imapport = this.customProvider ? this.customImapFormGroup.value.imaphost.split(':').length > 1 ? this.customImapFormGroup.value.imaphost.split(':')[1] : 993 : 993;
        this.hasError = false;
        this.verifying = true;
        var self = this;

        try {
            //start checker for timeout because of e.g. invalid hostnames... WORKAROUND
            setTimeout(function () {
                if (!self.imapResponded) {
                    this.hasError = true;
                    this.errorMessage = "Could not connect to your mail server. Please go back and check your settings.";
                }
            }, 5000);


            //create imap client
            await this._imapService.create(this.customProvider ?
                this.customImapFormGroup.value.username : this.mailFormGroup.value.email,
                this.customProvider ?
                    this.customImapFormGroup.value.password : this.passwordFormGroup.value.password, imaphost, imapport);


            this.imapResponded = true;

            //try to connect
            await this._imapService.open();

            //read out trash mailbox path
            var mboxes = await this._imapService.getMailBoxes();
            var gmailBoxes = mboxes.children.filter(function (e) {
                return e.name == "[Gmail]";
            });
            if (gmailBoxes.length > 0) {
                var trashBox = findMailboxWithFlag("Trash", gmailBoxes[0]);
                var sentBox = findMailboxWithFlag("Sent", gmailBoxes[0]);
                this.customImapFormGroup.value.trashBoxPath = trashBox == null ? "Trash" : trashBox.path;
                this.customImapFormGroup.value.sentBoxPath = sentBox == null ? "Sent" : sentBox.path;
            } else {
                var trashPath = "";
                var sentPath = "";
                for (var index in mboxes.children) {
                    var node = mboxes.children[index];
                    for (var i = 0; i < node.flags.length; i++) {
                        if (typeof node.flags[i] === 'string' || node.flags[i] instanceof String) {
                            if (node.flags[i].indexOf('Trash') != -1) {
                                trashPath = node.path;
                            }

                            if (node.flags[i].indexOf('Sent') != -1) {
                                sentPath = node.path;
                            }
                        }
                    }
                }

                this.customImapFormGroup.value.trashBoxPath = trashPath == "" ? "Trash" : trashPath;
                this.customImapFormGroup.value.sentBoxPath = sentPath == "" ? "Sent" : sentPath;
            }

            //close after connection without error
            await this._imapService.close();



            var smtphost = this.customProvider ? this.customImapFormGroup.value.smtphost.split(':')[0] : "smtp.gmail.com";
            var smtpport = this.customProvider ? this.customImapFormGroup.value.smtphost.split(':').length > 1 ? this.customImapFormGroup.value.smtphost.split(':')[1] : 465 : 465;

            //try smtp server
            await this._smtpService.create(this.customProvider ?
                this.customImapFormGroup.value.username : this.mailFormGroup.value.email,
                this.customProvider ?
                    this.customImapFormGroup.value.password : this.passwordFormGroup.value.password, smtphost, smtpport);


            //try to connect
            await this._smtpService.open();

            //close after connection without error
            await this._smtpService.close();

            //disable editing for previous steps 
            this.editable = false;

            //set stepper to next step
            this.stepper.next();
        } catch (error) {
            console.error(error);
            this.imapResponded = true;
            this.hasError = true;

            this.errorMessage = error.data ? error.data.message : error;
        }
    }
}


function findMailboxWithFlag(flag, currentNode) {

    if (flag === currentNode.flag) {
        return currentNode;
    } else {
        for (var index in currentNode.children) {
            var node = currentNode.children[index];
            for (var i = 0; i < node.flags.length; i++) {
                if (typeof node.flags[i] === 'string' || node.flags[i] instanceof String) {
                    if (node.flags[i].indexOf(flag) != -1) {
                        node.flag = flag;
                        return node;
                    }
                }
            }
            findMailboxWithFlag(flag, node);
        }
        return "No Node Present";
    }
}