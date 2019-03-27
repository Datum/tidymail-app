import { ChangeDetectorRef, Component, Inject, Optional, AfterViewInit, OnInit } from '@angular/core';
import { MdcDialog, MdcDialogRef, MDC_DIALOG_DATA } from '@angular-mdc/web';
import { Validators, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';


@Component({
  templateUrl: 'dialog-password.html',
})
export class DialogPassword {
  constructor(
    @Optional() @Inject(MDC_DIALOG_DATA) private dialogData: any,
    private dialogRef: MdcDialogRef<DialogPassword>
  ) {}

  profileForm = new FormGroup({
    password: new FormControl('', Validators.required)
  });

  submit(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.dialogRef.close(this.profileForm.value.password);
  }
}