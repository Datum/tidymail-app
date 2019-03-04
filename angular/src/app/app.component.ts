import { ChangeDetectorRef, Component, Inject } from '@angular/core';

import { TAB_ID } from './tab-id.injector';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
// tslint:disable:variable-name
export class AppComponent {
  readonly tabId = this._tabId;
  message: string;

  constructor(@Inject(TAB_ID) private _tabId: number, private _changeDetector: ChangeDetectorRef) {}

  onClick(): void {
    chrome.tabs.sendMessage(this._tabId, 'request', message => {
      this.message = message;
      this._changeDetector.detectChanges();
    });
  }

  tabs = [
    { label: 'New', icon: 'info', count: 1 },
    { label: 'Unsubscribed', icon: 'email', count: 10 }
  ];

  mails = [
      { title: 'Test-Title', description: 'blah aldhsflhajsdhfasd ',  icon: 'https://s2.googleusercontent.com/s2/favicons?domain=Atlassian.net' }
  ]
}
