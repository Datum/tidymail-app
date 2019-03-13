import { Message } from './message.model';

export class MessageGroup {
    messages : Message[];
    name: string;
    icon: string;
    hostname:string;
    subject:string;

    get unreadCount():number {
        return this.messages.filter((obj) => obj.unread === true).length
    }

    get unreadPercent():number {
        return this.unreadCount / this.messages.length;
    }
}