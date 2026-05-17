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
import { UseGuards } from '@nestjs/common';
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