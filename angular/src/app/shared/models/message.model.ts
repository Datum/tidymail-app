enum Status {
    New,
    Unsubscribe,
    Keep,
    Deleted,
}

export class Message {

    constructor() {
        this.status = Status.New;
        this.isChecked = false;
    }


    id:string;
    threadId:string;
    unread:boolean;
    from:string;
    subject:string;
    unsubscribeUrl:string;
    internalDate:number;
    hostname:string;
    status:Status;
    payload:any;
    labelIds:any;
    isChecked:boolean;
}