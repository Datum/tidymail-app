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
    percentage: any;

    ngOnInit() {
        var self = this;
        this.data.subscribe(function (res) {
            self.pieChartLabels = res.labels;
            self.pieChartData = [res.numbers[1],res.numbers[0]],
            self.pieChartSummary = res.summaryLabel;
            self.options = {
                'responsive': false,
                'legend': false,
                tooltips: {
                    enabled: false
                },
                elements: {
                    arc: {
                        borderWidth: 0
                    }
                },
                rotation: 1 * Math.PI,
                circumference: 1 * Math.PI,
                cutoutPercentage: 60
            },
            self.percentage=Math.ceil((res.numbers[1]*100)/res.numbers[0]);
            // self.colors = ['#304ffe','#c5cae9'];
        })


    }


    private chartColors=[{
          backgroundColor: [
            "#304ffe",
            "#c5cae9"
        ],
        /*
          borderColor: 'rgba(225,10,24,0.2)',
          pointBackgroundColor: 'rgba(225,10,24,0.2)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(225,10,24,0.2)'
          */
      }];

    public pieChartLabels: string[] = [];
    public pieChartData: any;
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
