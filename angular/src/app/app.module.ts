import { BrowserModule } from '@angular/platform-browser';
//import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';


import { HomeModule } from './modules/home/home.module'

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
    DataService
  } from './shared';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
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
  providers: [DataService],
  bootstrap: [AppComponent]
})
export class AppModule { }
