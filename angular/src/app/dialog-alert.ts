import { ChangeDetectorRef, Component, Inject, Optional, AfterViewInit, OnInit } from '@angular/core';
import { MdcDialog, MdcDialogRef, MDC_DIALOG_DATA } from '@angular-mdc/web';



@Component({
    templateUrl: 'dialog-alert.html',
  })
  export class DialogAlert {

    msg:string = 'TEst';

    constructor(
        @Optional() @Inject(MDC_DIALOG_DATA) private dialogData: any,
        private dialogRef: MdcDialogRef<DialogAlert>
      ) {}

     ngOnInit(): void {
        // alternatively, rename ‘dialogData’ to ‘values’ and remove the
        // ‘ngOnInit’ method
        this.msg = this.dialogData.label;
      }
  }