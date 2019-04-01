import { Message } from './message.model';

export class MessageGroup {
    constructor() {
        this.isCollapsed = true;
        this.keepLoading = false;
        this.unsubLoading = false;
        this.deleteLoading = false;
        this.messages = [];
    }

    key:string;
    messages : Message[];
    estimatedMessageCount:number;
    name: string;
    icon: string;
    hostname:string;
    subject:string;
    from:string;
    ids:string[];
    isCollapsed:boolean;
    status:string;
    statusText:string;
    keepLoading:boolean;
    unsubLoading:boolean;
    deleteLoading:boolean;
}