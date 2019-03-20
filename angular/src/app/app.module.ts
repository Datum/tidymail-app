import { BrowserModule } from '@angular/platform-browser';
//import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';


import { HomeModule } from './modules/home/home.module'

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
    MdcLinearProgressModule  
} from '@angular-mdc/web';


import {
    GmailService,
    DbService,
    UserService,
  } from './shared';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
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
    MdcLinearProgressModule
  ],
  providers: [GmailService, DbService, UserService],
  bootstrap: [AppComponent]
})
export class AppModule { }
