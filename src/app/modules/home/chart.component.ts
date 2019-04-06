import { Component, OnInit, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { ChartData } from 'src/app/shared';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit {
  @Input() data: Observable<ChartData>;

  constructor() { }

  ngOnInit() {
      var self = this;
      console.log(this.data);
      this.data.subscribe(function(res) {
        console.log('event');
        self.pieChartLabels = res.labels;
        self.pieChartData = res.numbers;
      })

    
  }

  

  public pieChartLabels:string[] = [];
  public pieChartData:number[] = [];
  public pieChartType:string = 'doughnut';
  public pieChartOptions:any = {'legend': { 'display': false}, 'fullWidth': false, 'backgroundColor': [
               "#FF6384",
            "#4BC0C0",
            "#FFCE56",
            "#E7E9ED",
            "#36A2EB"
            ], 'circumference':  Math.PI, 'rotation': -Math.PI}
 
  // events on slice click
  public chartClicked(e:any):void {
    console.log(e);
  }
 
 // event on pie chart slice hover
  public chartHovered(e:any):void {
    console.log(e);
  }

}
