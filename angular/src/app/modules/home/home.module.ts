import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { HomeComponent } from './home.component';
import { ListComponent } from './list.component';
import { InstallComponent } from './install.component';
import { FormsModule } from '@angular/forms';


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
    MdcChipsModule,
    MdcRadioModule,
    MdcFormFieldModule
} from '@angular-mdc/web';


import {

} from '../../shared';


import { RouterModule } from '@angular/router';
import { ModuleWithProviders } from '@angular/compiler/src/core';
import { SettingsComponent } from './settings.component';


import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


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
        path: 'install',
        component: InstallComponent,
    },
    /*
    {
        path: 'detail/:id/:status',
        component: DetailComponent,
    },
    */
]);


@NgModule({
    declarations: [
        HomeComponent,
        SettingsComponent,
        ListComponent,
        InstallComponent
    ],
    imports: [
        dataRouting,
        BrowserModule,
        FormsModule,
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
        MdcChipsModule,
        MdcRadioModule,
        MdcFormFieldModule,
    ],
    exports: [HomeComponent],
    providers: [],
})
export class HomeModule { }
