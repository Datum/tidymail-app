import { Component, OnInit, Input } from '@angular/core';
import { ChartData } from 'src/app/shared';
import { MailBox } from 'src/app/shared/models/mailbox.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-stats-mailbox',
    templateUrl: './stats-mailbox.component.html',
    styleUrls: ['./stats-mailbox.component.scss']
})
export class StatsMailboxComponent implements OnInit {
    @Input() mailbox: Observable<MailBox>;


    chartData:any = new ChartData;
    _mailbox:MailBox;

    constructor() { }


    /*
     email:string;
    totalMails:number;
    totalSize:number;
    totalNewsletters:number;
    totalNewsletterSize:number;
    newsletterReadPercentage:number;
    */

    ngOnInit() {
        var self = this;
        this.chartData = this.mailbox.pipe(map((box:MailBox) => {
            return self.getMailBoxChartData(box);
        }))

        this.mailbox.subscribe(function(box) {
            self._mailbox = box;
        });
    }

    private getMailBoxChartData(info) {
        var chartData = new ChartData();
        chartData.numbers = [info.totalMails - info.totalNewsletters, info.totalNewsletters]
        chartData.labels = ["OTHERS (" + (info.totalMails - info.totalNewsletters) + ")", "NEWSLETTERS (" + info.totalNewsletters + ")"];
        return chartData;
    }
}
