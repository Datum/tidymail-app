enum Status {
    New,
    Unsubscribe,
    Keep,
}

export class Message {

    constructor() {
        this.status = Status.New;
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
}