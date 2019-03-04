import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import {
    MdcFabModule,
    MdcIconModule,
    MdcMenuModule,
    MdcButtonModule,
    MdcTopAppBarModule,
    MdcTabBarModule ,
    MdcListModule 
  } from '@angular-mdc/web';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MdcFabModule,
    MdcIconModule,
    MdcMenuModule,
    MdcButtonModule,
    MdcTopAppBarModule ,
    MdcTabBarModule ,
    MdcListModule 
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
