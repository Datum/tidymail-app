import { Component, OnInit } from '@angular/core';
import { UIService, UserService, ImapService, DbService } from '../../shared';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-install',
  templateUrl: './install.component.html',
  styleUrls: ['./install.component.scss']
})
export class InstallComponent implements OnInit {


  imap_username: string;// = "florian@datum.org";
  imap_password: string;// = "meblmmoxaxwejrov";
  imap_host: string = '';
  imap_port: string = '';
  imap_savepassword: boolean = true;
  selectedMailProvider: string;
  providers: string[] = ['Gmail', 'Other'];
  buttonText: string = "Login";
  discoverButtonText: string = "Discover Settings";
  emailSettingsFinderUrl: string = "https://emailsettings.firetrust.com/settings?q=";


  showPasswordField: boolean = false;
  showImapSettingsFields: boolean = false;

  constructor(
    private _userService: UserService,
    private _imapService: ImapService,
    private _uiService: UIService,
    private _dbService: DbService,
    private router: Router,
    private http: HttpClient) {
  }

  ngOnInit() {
  }


  async check() {
    var self = this;

    this.discoverButtonText = "Discovering...";
    try {
      var result = await this.http.get<any>(this.emailSettingsFinderUrl + this.imap_username).toPromise();

      //there is a special password set hint for this domain
      if (result.password != "") {
        alert(result.password);
      }

      var bFound = false;
      result.settings.forEach(element => {
        if (element.protocol == "IMAP") {
          this.imap_host = element.address;
          this.imap_port = element.port;
          bFound = true;
        }
      });

      if(!bFound) {
        this.showImapSettingsFields = true;
      }

      this.showPasswordField = true;
    } catch (error) {
      //nothing found, try with several default names

      var domain = extractHostname(this.imap_username);
      var imapDomain = 'imap.' + domain;

      this._imapService.init(this.imap_username, this.imap_password, this.imap_host, this.imap_port, true, async function (pem) {
        try {
          //open imap client
          await self._imapService.open();

          //seems to work
          await self._imapService.close();

          //set host/port
          self.imap_host = imapDomain;
          self.imap_port = "993";

          //show password field
          self.showPasswordField = true;
        } catch (error) {
          //failed
          self.showImapSettingsFields = true;
          self.showPasswordField = true;
        }
      });
    }
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

        //if remember is disabled, remove password from save process
        if (!self.imap_savepassword) {
          self.imap_password = "";
        }

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


function extractHostname(mail) {
  var at = mail.lastIndexOf('@');
  if (at != -1) {
    var domain = mail.substr(at + 1);
    var dotCount = domain.split(".").length - 1;
    if (dotCount > 1) {
      var ii = domain.indexOf('.');
      if (ii != -1) {
        domain = domain.substr(ii + 1);
      }
    }
    return domain;
  }
  return mail;
}