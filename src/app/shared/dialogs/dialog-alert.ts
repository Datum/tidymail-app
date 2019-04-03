import { ChangeDetectorRef, Component, Inject, Optional, AfterViewInit, OnInit } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';


export interface DialogData {
    title: string;
    content: string;
    extraContent: string;
  }

@Component({
    templateUrl: 'dialog-alert.html',
})
export class DialogAlert {

    constructor(
        public dialogRef: MatDialogRef<DialogAlert>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

    onNoClick(): void {
        this.dialogRef.close();
    }
}