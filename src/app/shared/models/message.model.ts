enum Status {
    New,
    Unsubscribe,
    Keep,
    Deleted,
    Ignore,
}

export class Message {

    constructor() {
            this.status = Status.New;
    }

    hostname:string;
    from:string;
    lastId:string;
    lastSubject:string;
    lastDate:number;
    ignoreIds:[];
    unreadCount:number;
    readCount:number;
    unsubscribeUrl:string;
    unsubscribeEmail:string;
    unsubscribeDate:number;
    statusDate:number;
    status:Status;
    size:number;
}