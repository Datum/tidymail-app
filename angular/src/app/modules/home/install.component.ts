import { Component, OnInit } from '@angular/core';
import { UIService, UserService, ImapService, DbService } from '../../shared';
import { Router } from '@angular/router';

@Component({
  selector: 'app-install',
  templateUrl: './install.component.html',
  styleUrls: ['./install.component.scss']
})
export class InstallComponent implements OnInit {


  imap_username: string;// = "florian@datum.org";
  imap_password: string;// = "meblmmoxaxwejrov";
  imap_host: string = 'mail.shinternet.ch';
  imap_port: string = '993';
  imap_savepassword: boolean = true;
  selectedMailProvider: string;
  providers: string[] = ['Gmail', 'Other'];



  buttonText: string = "Login";

  constructor(
    private _userService: UserService,
    private _imapService: ImapService,
    private _uiService: UIService,
    private _dbService: DbService,
    private router: Router) {
  }

  ngOnInit() {
  }

  async login() {

    this.buttonText = "Connecting...";

    var self = this;

    if (this.selectedMailProvider != "Gmail") {
      if (this.imap_host == '' || this.imap_port == '') {
        alert('empty host / port');
      }
    } else {
      this.imap_host = 'imap.gmail.com';
      this.imap_port = "993";
    }

    if (this.imap_password == '' || this.imap_username == '') {
      alert('empty username/password');
      return;
    }

    //init imap service with credentials
    this._imapService.init(this.imap_username, this.imap_password, this.imap_host, this.imap_port, true, async function (pem) {

      //try to open 
      try {
        //open imap client
        await self._imapService.open();

        //check if host is gmail (supports gmail search, etc)
        var isProviderGmail = await self._imapService.isGmail();

        //if successfull , store to localStorage
        await self._userService.storeImapSettings(self.imap_host, self.imap_port, self.imap_username, self.imap_password, isProviderGmail);

        //init database
        await self._dbService.create();

        //navigate back to home
        self.router.navigateByUrl('/');

      } catch (error) {
        self._uiService.showAlert(error);
      }


      self.buttonText = "Login";
    });
  }

}
