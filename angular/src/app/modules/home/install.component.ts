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


  imap_username: string;
  imap_password: string;
  imap_host: string = '';
  imap_port: string = '993';
  imap_savepassword: boolean = true;
  selectedMailProvider: string;
  providers: string[] = ['Gmail', 'Other'];
  defaultMailDomainsToCheck: string[] = ['imap', 'mail'];
  buttonText: string = "Login";
  discoverButtonText: string = "Discover Settings";
  emailSettingsFinderUrl: string = "https://emailsettings.firetrust.com/settings?q=";
  dnsCheckUrl: string = "https://dns-api.org/AAAA/";


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

    if (this.imap_username === undefined) {
      return;
    }

    this.discoverButtonText = "Discovering...";
    try {
      //try to get settings with discovery service url
      var result = await this.http.get<any>(this.emailSettingsFinderUrl + this.imap_username).toPromise();

      //there is a special password set hint for this domain
      if (result.password != "") {
        self._uiService.showAlert("Please set an app specific password. Help cound be found here: " + result.password);
      }

      //check if IMAP exists
      var bFound = false;
      result.settings.forEach(element => {
        if (element.protocol == "IMAP") {
          this.imap_host = element.address;
          this.imap_port = element.port;
          bFound = true;
        }
      });

      //if not exists, throw error for alternate discovery
      if (!bFound) {
        throw new Error('Alternate Discovery Process');
      } else {
        self.showPasswordField = true;
      }
    } catch (error) {
      //extract domain and try with default name imap.emailprovider.com / 993, only SSL connections are allowed
      var domain = extractHostname(this.imap_username);
      var imapFound = false;

      for (var i = 0; i < this.defaultMailDomainsToCheck.length; i++) {
        var imapDomain = this.defaultMailDomainsToCheck[i] + '.' + domain;


        //workaround, because socket server crashes!
        
        try {
          var result = await this.http.get<any>(this.dnsCheckUrl + imapDomain).toPromise();
        } catch (error) {
          continue;
        }

        try {
          var pem = await this._imapService.init(this.imap_username, this.imap_password, imapDomain, this.imap_port);
          await this._imapService.open();
        } catch (error) {
          if (error == "Error: Authentication failed.") {
            imapFound = true;
            self.imap_host = imapDomain;
            self.imap_port = "993";
            self.showPasswordField = true;
          }
        }
      }

      self.showImapSettingsFields = true;
      self.showPasswordField = true;
    }
  }


  //login
  async login() {

    var self = this;

    this.buttonText = "Connecting...";

    //init imap service with credentials
    var pem = await this._imapService.init(this.imap_username, this.imap_password, this.imap_host, this.imap_port);

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

      //close client
      await self._imapService.close();

      //navigate back to home
      self.router.navigateByUrl('/');

    } catch (error) {
      self._uiService.showAlert(error);
    }

    self.buttonText = "Login";

  }

}


function extractHostname(mail) {
  var at = mail.lastIndexOf('@');
  if (at != -1) {
    var domain = mail.substr(at + 1);
    return domain;
  }
  return mail;
}