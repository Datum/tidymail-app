import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import { HomeModule } from './modules/home.module'
import { FormsModule, ReactiveFormsModule  } from '@angular/forms';


import {
    //GmailService,
    DbService,
    UserService,
    ImapService,
    UIService,
    SmtpService,
  } from './shared';

import { DialogAlert } from './shared/dialogs/dialog-alert';
import { DialogPassword } from './shared/dialogs/dialog-password';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HomeModule
  ],
  providers: [DbService, UserService,ImapService, UIService, SmtpService],
  bootstrap: [AppComponent],
  entryComponents: [DialogAlert, DialogPassword]
})
export class AppModule { }
