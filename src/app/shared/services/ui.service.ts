import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DialogAlert } from '../dialogs/dialog-alert';
import { DialogPassword } from '../dialogs/dialog-password';

@Injectable()
export class UIService {

    constructor(public dialog: MatDialog) { }

    showPasswordConfirm(callback = null) {
        const dialogRef = this.dialog.open(DialogPassword);

        dialogRef.afterClosed().subscribe(result => {
            if (callback) {
                callback(result);
            }
        });
    }

    showAlert(msg, msgExtra = "", callback = null) {
        const dialogRef = this.dialog.open(DialogAlert, {
            width: '250px',
            data: { title: "Warning", content: msg ,  extraContent: msgExtra }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (callback) {
                callback(result);
            }
        });
    }
}




