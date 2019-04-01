import { Message } from './message.model';

export class MessageList {
    messages : Message[]
    nextPageToken: string;
    resultSizeEstimate:number;
}