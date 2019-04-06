import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';
import { SettingsComponent } from './settings/settings.component';

import { RouterModule } from '@angular/router';
import { ModuleWithProviders } from '@angular/compiler/src/core';

import { MatCardModule, MatInputModule, MatIconModule, MatProgressBarModule, MatTabsModule, MatListModule, MatExpansionModule, MatSnackBarModule } from '@angular/material';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';


import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogAlert } from '../shared/dialogs/dialog-alert';
import { DialogPassword } from '../shared/dialogs/dialog-password';
import { ListComponent } from './home/list.component';


import { ChartsModule } from 'ng4-charts';
import { ChartComponent } from './home/chart.component';


const dataRouting: ModuleWithProviders = RouterModule.forChild([
    {
        path: '',
        component: HomeComponent,
    },
    {
        path: 'register',
        component: RegisterComponent,
    },
    {
        path: 'register/:step',
        component: RegisterComponent,
    },
    {
        path: 'settings',
        component: SettingsComponent,
    },
]);

@NgModule({
    declarations: [
        HomeComponent,
        RegisterComponent,
        SettingsComponent,
        ListComponent,
        DialogAlert,
        DialogPassword,
        ChartComponent
        
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        dataRouting,
        MatCardModule,
        MatStepperModule,
        MatInputModule,
        MatFormFieldModule,
        MatButtonModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatIconModule,
        MatProgressBarModule,
        MatTabsModule,
        MatListModule,
        MatExpansionModule,
        MatSnackBarModule,
        ChartsModule
    ]
})
export class HomeModule { }
