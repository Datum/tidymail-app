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
            host: ['imap.gmx.net', Validators.required],
            username: ['florian.honegger@gmx.ch', Validators.required],
            password: ['Tinetta,.12', Validators.required],
            trashBoxPath: ['Trash'],
            rememberMe: ['']
        });
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

        //set config
        var userConfig = this._userService.createOrLoadConfig();
        userConfig.firsttime = false;
        userConfig.hasJoinedRewardProgram = joinReward;
        userConfig.trashBoxPath = this.customImapFormGroup.value.trashBoxPath;
        if(joinReward) 
            userConfig.rewardJoinDate = Date.now();

        if (this.customProvider) {
            userConfig.imapurl = this.customImapFormGroup.value.host.split(':')[0];
            userConfig.imapport = this.customImapFormGroup.value.host.split(':').length > 1 ? this.customImapFormGroup.value.host.split(':')[1] : 993;
            userConfig.isGmailProvider = false;
            userConfig.username = this.customImapFormGroup.value.username;
            userConfig.email = this.mailFormGroup.value.email;
        } else {
            userConfig.isGmailProvider = true;
            userConfig.email = this.mailFormGroup.value.email;
            userConfig.username = this.mailFormGroup.value.email;
        }

        //save config
        this._userService.save(userConfig,this.customProvider ? this.customImapFormGroup.value.password : this.passwordFormGroup.value.password );

        //navigate to home
        this.router.navigateByUrl('/');

    }


    async verifiy() {
        var host = this.customProvider ? this.customImapFormGroup.value.host.split(':')[0] : "imap.gmail.com";
        var port = this.customProvider ? this.customImapFormGroup.value.host.split(':').length > 1 ? this.customImapFormGroup.value.host.split(':')[1] : 993 : 993;


        try {
            //create imap client
            await this._imapService.create(this.customProvider ? 
                this.customImapFormGroup.value.username :  this.mailFormGroup.value.email, 
                this.customProvider ? 
                this.customImapFormGroup.value.password : this.passwordFormGroup.value.password, host, port);

            //try to connect
            await this._imapService.open();

            //read out trash mailbox path
            var mboxes = await this._imapService.getMailBoxes();
            var gmailBoxes = mboxes.children.filter(function (e) {
                return e.name == "[Gmail]";
            });
            if (gmailBoxes.length > 0) {
                var trashBox = findMailboxWithFlag("Trash", gmailBoxes[0]);
                this.customImapFormGroup.value.trashBoxPath = trashBox == null ? "Trash" : trashBox.path;
            }

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


function findMailboxWithFlag(flag, currentNode) {

    if (flag === currentNode.flag) {
        return currentNode;
    } else {
        for (var index in currentNode.children) {
            var node = currentNode.children[index];
            for (var i = 0; i < node.flags.length; i++) {
                if (typeof node.flags[i] === 'string' || node.flags[i] instanceof String) {
                    if (node.flags[i].indexOf('Trash') != -1) {
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