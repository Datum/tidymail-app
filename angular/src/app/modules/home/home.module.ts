import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { HomeComponent } from './home.component';
import { DetailComponent} from './detail.component';
import { ListComponent} from './list.component';


import {
    MdcTopAppBarModule,
    MdcIconModule,
    MdcMenuModule,
    MdcListModule,
    MdcCheckboxModule,
    MdcTabBarModule,
    MdcDrawerModule,
    MdcIconButtonModule,
    MdcButtonModule,
    MdcLinearProgressModule,
    MdcTypographyModule,
    MdcSnackbarModule,
    MdcChipsModule 
} from '@angular-mdc/web';


import {
    
  } from '../../shared';

  import {RouterModule} from '@angular/router';
import { ModuleWithProviders } from '@angular/compiler/src/core';
import { SettingsComponent } from './settings.component';


import {NgbModule} from '@ng-bootstrap/ng-bootstrap';


  const dataRouting: ModuleWithProviders = RouterModule.forChild([
    {
        path: '',
        component: HomeComponent,
    },
    {
        path: 'settings',
        component: SettingsComponent,
    },
    {
        path: 'detail/:id/:status',
        component: DetailComponent,
    },
]);


@NgModule({
    declarations: [
        HomeComponent,
        SettingsComponent,
        DetailComponent,
        ListComponent
    ],
    imports: [
        dataRouting,
        BrowserModule,
        NgbModule,
        HttpClientModule,
        MdcIconModule,
        MdcTabBarModule,
        MdcListModule,
        MdcButtonModule,
        MdcLinearProgressModule,
        MdcCheckboxModule,
        MdcTypographyModule,
        MdcSnackbarModule,
        MdcChipsModule 
    ],
    exports: [ HomeComponent ],
    providers: [],
})
export class HomeModule { }
