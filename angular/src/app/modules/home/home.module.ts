import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { HomeComponent } from './home.component'


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
  } from '../../shared';

@NgModule({
    declarations: [
        HomeComponent
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        MdcIconModule,
        MdcTabBarModule,
        MdcListModule,
        MdcButtonModule,
        MdcLinearProgressModule
    ],
    exports: [ HomeComponent ],
    providers: [DataService],
})
export class HomeModule { }
