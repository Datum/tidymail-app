import { Message } from './message.model';

export class MessageGroup {

    constructor() {
        this.isCollapsed = true;
    }

    messages : Message[];
    name: string;
    icon: string;
    hostname:string;
    subject:string;
    from:string;
    ids:string[];
    isCollapsed:boolean;

    get unreadCount():number {
        return this.messages.filter((obj) => obj.unread === true).length
    }

    get unreadPercent():number {
        return this.unreadCount / this.messages.length;
    }
}