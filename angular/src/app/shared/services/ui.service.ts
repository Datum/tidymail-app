import { Injectable } from '@angular/core';
import { MdcDialog, MdcDialogRef, MDC_DIALOG_DATA } from '@angular-mdc/web';
import { DialogAlert } from '../../dialog-alert';
import { DialogPassword } from '../../dialog-password';

@Injectable()
export class UIService {

    constructor(public dialog: MdcDialog) { }

    showPasswordConfirm(callback = null) {
        const dialogRef = this.dialog.open(DialogPassword);

        dialogRef.afterClosed().subscribe(result => {
            if(callback) {
                callback(result);
            }
        });
    }

    showAlert(msg, callback = null) {
        const dialogRef = this.dialog.open(DialogAlert, {
            escapeToClose: false,
            clickOutsideToClose: false,
            buttonsStacked: false,
            id: 'my-dialog',
            data: { label: msg }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (callback) {
                callback(result);
            }
        });
    }
}




