import { ChangeDetectorRef, Component, Inject, Optional, AfterViewInit, OnInit } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import { Validators, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';


export interface DialogData {
    password: string;
  }
  

@Component({
  templateUrl: 'dialog-password.html',
})
export class DialogPassword {
    constructor(
        public dialogRef: MatDialogRef<DialogPassword>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  profileForm = new FormGroup({
    password: new FormControl('', Validators.required)
  });

  submit(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.dialogRef.close(this.profileForm.value.password);
  }

  onNoClick() {
      
  }
}