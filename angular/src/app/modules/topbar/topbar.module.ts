import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { TopbarComponent } from './topbar.component'


import {
    MdcTopAppBarModule,
    MdcIconModule,
    MdcMenuModule,
    MdcListModule,
    MdcTabBarModule,
    MdcDrawerModule,
    MdcIconButtonModule,
    MdcButtonModule,
    MdcTypographyModule 
} from '@angular-mdc/web';


@NgModule({
    declarations: [
        TopbarComponent
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        MdcIconModule,
        MdcButtonModule,
        MdcTypographyModule 
    ],
    exports: [ TopbarComponent ]
    //providers: [DataService],
})
export class TopbarModule { }
