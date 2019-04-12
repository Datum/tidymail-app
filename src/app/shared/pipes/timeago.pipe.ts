import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({ name: 'timeago' })
export class TimeAgoPipe implements PipeTransform {

    transform(date: number): string {
        return moment(date).fromNow();
    }
}