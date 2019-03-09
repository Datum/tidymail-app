import { ChangeDetectorRef, Component, Inject, AfterViewInit, OnInit } from '@angular/core';


import { DataService } from '../../shared';


@Component({
    selector: 'home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
// tslint:disable:variable-name
export class HomeComponent implements OnInit  {
    constructor(private _dataService: DataService,private _changeDetector: ChangeDetectorRef) {}

    messages:any = [];

    ngOnInit() {
        this.getMessages();
    }


    getMessages() {
        this._dataService.getMessages()
            .subscribe(resp => {
                this.messages = resp.messages;
                //this.tabs[0].count = resp.messages.length;
                this._changeDetector.detectChanges();


                //get details

                var index = 0;

                this.loadItem(index, this.messages.length);
            }, error => {
                //try to relog
                //this.login();
            });
    }

    loadItem(index, maxRows) {
        this._dataService.getMessage(this.messages[index].id).subscribe(msg => {
            for(var a = 0; a < msg.payload.headers.length;a++) {
                if(msg.payload.headers[a].name == "Subject")
                {
                    this.messages[index].subject = msg.payload.headers[a].value;
                }

                if(msg.payload.headers[a].name == "From")
                {
                    this.messages[index].from = msg.payload.headers[a].value;
                }

                if(msg.payload.headers[a].name == "List-Unsubscribe")
                {
                    this.messages[index].unsubscribeURL = msg.payload.headers[a].value;
                }
            }

            

            //if no unsubscribe header found, try to get from body
            if(this.messages[index].unsubscribeURL === undefined) {
                try {
                    var plainText = atob(msg.payload.body.data);

                    //Extract urls from body
                    var urls = getURLsFromString(plainText);
                    var bUnSub = false;
                    for(var u = 0;u < urls.length;u++) {
                        var n = urls[u].search("unsubscribe");
                        if(n != -1) {
                            
                            this.messages[index].unsubscribeURL = urls[u];
                        }
                    }
                } catch(error) {
                    //alert(msg.id);
                }   
            }

            index++;
            if(index < maxRows) {
                this._changeDetector.detectChanges();
                this.loadItem(index, maxRows);
            } 
        });
    }
}



function getURLsFromString(str) {
    var re = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%\/.\w-]*)?\??(?:[-+=&;%@.\w]*)#?\w*)?)/gm; 
    var m;
    var arr = [];
    while ((m = re.exec(str)) !== null) {
      if (m.index === re.lastIndex) {
          re.lastIndex++;
      }
      arr.push(m[0]);
    }
    return arr;
  }