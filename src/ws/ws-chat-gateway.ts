import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayConnection,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import type { AuthenticatedSocket } from '../types/socket.types';
import { ChatService } from '../chats/chat.service';
import { WsJwtGuard } from './ws-chat-jwt-auth-guard';
import { AddMessageDto } from '../chats/add-message-dto';

@WebSocketGateway({
    cors: { origin: '*' },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    constructor(private chatService: ChatService) { }

    // =========================
    // USER CONNECTS
    // =========================
    handleConnection(client: AuthenticatedSocket) {
        const userId = client.user._id.toString();

        // 🔥 JOIN ROOM = USER ID
        client.join(userId);

        console.log(`User connected: ${userId}`);
    }

    // =========================
    // SEND MESSAGE EVENT
    // =========================
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() payload: AddMessageDto,
        @ConnectedSocket() client: AuthenticatedSocket,
    ) {
        const senderId = client.user._id.toString();

        // 1. find or create chat
        const chat = await this.chatService.findOrCreateChat(
            senderId,
            payload.receiverId,
        );

        // 2. create message object
        const message = {
            content: payload.content,
            attachment: payload.attachment || '',
            mimeType: payload.mimeType || '',
            senderId,
            createdAt: new Date(),
            receiverId: payload.receiverId,
        };

        // 3. save message
        await this.chatService.addMessage(chat._id.toString(), message);

        // 4. send ONLY to receiver room
        this.server.to(payload.receiverId).emit('receiveMessage', {
            chatId: chat._id,
            message,
        });

        // optional: also send back to sender (sync UI)
        this.server.to(senderId).emit('receiveMessage', {
            chatId: chat._id,
            message,
        });

        return { success: true };
    }
}