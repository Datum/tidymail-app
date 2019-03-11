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

  import {RouterModule} from '@angular/router';
import { ModuleWithProviders } from '@angular/compiler/src/core';
import { SettingsComponent } from './settings.component';



  const dataRouting: ModuleWithProviders = RouterModule.forChild([
    {
        path: '',
        component: HomeComponent,
    },
    {
        path: 'settings',
        component: SettingsComponent,
    },
]);


@NgModule({
    declarations: [
        HomeComponent,
        SettingsComponent
    ],
    imports: [
        dataRouting,
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
