import { BrowserModule } from '@angular/platform-browser';
//import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';


import { HomeModule } from './modules/home/home.module'

import { DialogAlert } from './dialog-alert';
import { DialogPassword } from './dialog-password';

import {NgbModule} from '@ng-bootstrap/ng-bootstrap';


import {
    MdcTopAppBarModule,
    MdcIconModule,
    MdcMenuModule,
    MdcListModule,
    MdcTabBarModule,
    MdcDrawerModule,
    MdcIconButtonModule,
    MdcButtonModule,
    MdcLinearProgressModule,
    MdcRadioModule,
    MdcFormFieldModule,
    MdcDialogModule,
    MdcTextFieldModule
} from '@angular-mdc/web';


import {
    //GmailService,
    DbService,
    UserService,
    ImapService,
    UIService
  } from './shared';



@NgModule({
  declarations: [
    AppComponent,
    DialogAlert,
    DialogPassword,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule.forRoot(),
    /*BrowserAnimationsModule,*/
    HttpClientModule,
    AppRoutingModule,
    HomeModule,
    MdcTopAppBarModule,
    MdcIconModule,
    MdcMenuModule,
    MdcListModule ,
    MdcTabBarModule,
    MdcDrawerModule,
    MdcIconButtonModule,
    MdcButtonModule,
    MdcLinearProgressModule,
    MdcRadioModule,
    MdcFormFieldModule,
    MdcDialogModule,
    MdcTextFieldModule
  ],
  providers: [/*GmailService,*/ DbService, UserService,ImapService, UIService],
  bootstrap: [AppComponent],
  entryComponents: [DialogAlert, DialogPassword]
})
export class AppModule { }
