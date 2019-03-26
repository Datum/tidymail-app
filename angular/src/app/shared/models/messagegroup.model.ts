import { Message } from './message.model';

export class MessageGroup {

    constructor() {
        this.isCollapsed = true;
        this.keepLoading = false;
        this.unsubLoading = false;
        this.deleteLoading = false;
    }

    messages : Message[];
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
    messageCount:number;

    get unreadCount():number {
        return this.messages.filter((obj) => obj.unread === true).length
    }

    get unreadPercent():number {
        return this.unreadCount / this.messages.length;
    }
}