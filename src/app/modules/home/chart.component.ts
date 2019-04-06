import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { Observable } from 'rxjs';
import { ChartData } from 'src/app/shared';

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit {
    @Input() data: Observable<ChartData>;
    @ViewChild('mycanvas')
    canvas: ElementRef;

    constructor() { }


    options: any;

    ngOnInit() {
        var self = this;
        var ctx = this.canvas.nativeElement.getContext("2d");



        this.data.subscribe(function (res) {
            self.pieChartLabels = res.labels;
            self.pieChartData = res.numbers;
            self.pieChartSummary = res.summaryLabel;
            self.options = {
                'legend': { 'display': res.summaryLabel === undefined, 'position': 'right', labels: { boxWidth: 4, fontSize: 12 } },
                'fullWidth': false,
                'backgroundColor': [
                    "#4BC0C0",
                    "#FFCE56",
                    "#E7E9ED",
                    "#36A2EB",
                ], animation: {
                    onComplete: function (animation) {
                        //self.middleTex(ctx);
                    }
                }, layout: {
                    padding: {
                        left: 0,
                        right: 0,
                        top: 5,
                        bottom: 0
                    }
                }
            }
        })


    }


    chartColors() {
        return [{
          backgroundColor: [
            "#4BC0C0",
            "#FFCE56",
            "#E7E9ED",
            "#36A2EB",
        ],
        /*
          borderColor: 'rgba(225,10,24,0.2)',
          pointBackgroundColor: 'rgba(225,10,24,0.2)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(225,10,24,0.2)'
          */
      }]
    }

    public pieChartLabels: string[] = [];
    public pieChartData: number[] = [];
    public pieChartType: string = 'doughnut';
    public pieChartSummary: string = '';

    // events on slice click
    public chartClicked(e: any): void {
        console.log(e);
    }

    // event on pie chart slice hover
    public chartHovered(e: any): void {
        console.log(e);
    }

}
