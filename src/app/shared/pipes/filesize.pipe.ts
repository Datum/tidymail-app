import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filesize' })
export class FileSizePipe implements PipeTransform {
    transform(size: number): string {
        //MB
        // return (size / (1024 * 1024)).toFixed(2) + 'MB';
        
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (size == 0) return '0 Byte';
        var i = parseInt((Math.floor(Math.log(size) / Math.log(1024)).toString()));
        return parseFloat((size / Math.pow(1024, i)).toString()).toFixed(2) + ' ' + sizes[i];
    }
}