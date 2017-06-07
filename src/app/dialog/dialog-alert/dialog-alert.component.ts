import {Component, Inject} from '@angular/core';
import {MD_DIALOG_DATA} from '@angular/material';

export interface DialogAlertData {
  title: string;
  message: string;
}

@Component({
  selector: 'app-dialog-alert',
  templateUrl: './dialog-alert.component.html',
  styleUrls: ['./dialog-alert.component.css']
})
export class DialogAlertComponent {

  constructor(@Inject(MD_DIALOG_DATA) public data: DialogAlertData) {
  }

}