import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import type { AuthenticatedSocket } from '../types/socket.types';
import { ChatService } from '../chats/chat.service';
import { WsJwtGuard } from './ws-chat-jwt-auth-guard';
import { AddMessageDto } from '../chats/add-message-dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
    cors: { origin: '*' },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        @Inject(forwardRef(() => ChatService))
        private chatService: ChatService,
        private jwtService: JwtService,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    // =========================
    // USER CONNECTS
    // =========================
    async handleConnection(client: AuthenticatedSocket) {
        try {
            const token =
                client.handshake?.auth?.token ||
                client.handshake?.headers?.authorization?.split(' ')[1];

            console.log(`User connected and set online: ${token}`);

            if (!token) {
                console.log('No token provided. Disconnecting...');
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token);
            const user = await this.userModel.findById(payload.sub);



            if (!user || user.currentToken !== token) {
                console.log('Invalid token/session. Disconnecting...');
                client.disconnect();
                return;
            }

            client.user = user;
            const userId = user._id.toString();

            // 🔥 JOIN ROOM = USER ID
            client.join(userId);

            // Update user to online in database
            await this.userModel.findByIdAndUpdate(userId, { online: true });

            console.log(`User connected and set online: ${userId}`);
        } catch (err) {
            console.log('WS Connection auth failed. Disconnecting...', err.message);
            client.disconnect();
        }
    }

    // =========================
    // USER DISCONNECTS
    // =========================
    async handleDisconnect(client: AuthenticatedSocket) {
        if (client.user) {
            const userId = client.user._id.toString();
            const now = new Date();

            try {
                // Update user to offline & update lastSeen
                await this.userModel.findByIdAndUpdate(userId, {
                    online: false,
                    lastSeen: now,
                });

                console.log(`User disconnected and set offline: ${userId}`);

                // Broadcast logout event to all connected users
                this.server.emit('logged-off-user', { userId });
            } catch (err) {
                console.error(`Error updating disconnect status for user ${userId}:`, err.message);
            }
        }
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

        // 1. Find or create chat
        const chat = await this.chatService.findOrCreateChat(
            senderId,
            payload.receiverId,
        );

        // 2. Save message (this automatically handles saving, unread count increments,
        // and emits the message:new and conversation:updated Socket.IO events in real-time)
        const updatedChat = await this.chatService.addMessage(chat._id.toString(), {
            senderId,
            receiverId: payload.receiverId,
            content: payload.content,
            attachment: payload.attachment || '',
            mimeType: payload.mimeType || '',
        });

        // Emit receiveMessage for backwards compatibility with any existing client code
        if (updatedChat && updatedChat.messages.length > 0) {
            const lastMsg = updatedChat.messages[updatedChat.messages.length - 1];
            const msgPayload = {
                content: lastMsg.content,
                attachment: lastMsg.attachment || '',
                mimeType: lastMsg.mimeType || '',
                senderId,
                createdAt: lastMsg.createdAt,
                receiverId: payload.receiverId,
            };

            this.server.to(payload.receiverId).emit('receiveMessage', {
                chatId: chat._id,
                message: msgPayload,
            });

            this.server.to(senderId).emit('receiveMessage', {
                chatId: chat._id,
                message: msgPayload,
            });
        }

        return { success: true };
    }
}