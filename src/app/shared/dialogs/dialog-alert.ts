import { ChangeDetectorRef, Component, Inject, Optional, AfterViewInit, OnInit } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';


export interface DialogData {
    title: string;
    content: string;
    extraContent: string;
    checkboxText:string;
  }

@Component({
    templateUrl: 'dialog-alert.html',
})
export class DialogAlert 
{
    constructor(
        public dialogRef: MatDialogRef<DialogAlert>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

    checked:boolean = false;

    onCancel(): void {
        this.dialogRef.close({ state: 'cancel', checked: this.checked});
    }

    onOk(): void {
        this.dialogRef.close({ state: 'ok', checked: this.checked});
    }
}