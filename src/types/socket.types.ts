import type { Socket } from 'socket.io';
import type { UserDocument } from '../users/user.schema';

export interface AuthenticatedSocket extends Socket {
    user: UserDocument;
}

export interface MessagePayload {
    content: string;
    attachment?: string;
    mimeType?: string;
    senderId: string;
    receiverId: string;
}