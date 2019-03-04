import { Component } from '@angular/core';

const GmailFactory = require("gmail-js");
const gmail = new GmailFactory.Gmail();

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'datum-unsubscriber-extension';


  mails = [
      { title: 'Test-Title', description: 'Description'},
      { title: 'Test-Title 2', description: 'Description 2'},
      { title: 'Test-Title 3', description: 'Description 3'}
  ];

  tabs = [
    { label: 'New', icon: 'info', count: 10 },
    { label: 'Unsubscribed', icon: 'email', count: 0 }
  ];
}
