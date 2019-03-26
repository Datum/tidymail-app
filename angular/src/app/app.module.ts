import { BrowserModule } from '@angular/platform-browser';
//import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { FormsModule } from '@angular/forms';


import { HomeModule } from './modules/home/home.module'

import { DialogAlert } from './dialog-alert';

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
    MdcDialogModule 
} from '@angular-mdc/web';


import {
    GmailService,
    DbService,
    UserService,
    ImapService,
  } from './shared';

@NgModule({
  declarations: [
    AppComponent,
    DialogAlert
  ],
  imports: [
    BrowserModule,
    FormsModule,
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
    MdcDialogModule 
  ],
  providers: [GmailService, DbService, UserService,ImapService],
  bootstrap: [AppComponent],
  entryComponents: [DialogAlert]
})
export class AppModule { }
