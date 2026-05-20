import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat, ChatDocument, ParticipantSearchInfo } from './chat.schema';
import { User, UserDocument } from '../users/user.schema';
import { AddMessageDto } from './add-message-dto';
import { ChatGateway } from '../ws/ws-chat-gateway';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @Inject(forwardRef(() => ChatGateway))
        private chatGateway: ChatGateway,
    ) { }

    async findOrCreateChat(senderId: string, receiverId: string) {
        // Query using nested participants.userId path
        let chat = await this.chatModel.findOne({
            "participants.userId": { $all: [senderId, receiverId] },
        });

        if (!chat) {
            // Fetch both user profiles to populate ParticipantSearchInfo
            const [sender, receiver] = await Promise.all([
                this.userModel.findById(senderId),
                this.userModel.findById(receiverId),
            ]);

            if (!sender || !receiver) {
                throw new Error('Sender or receiver not found');
            }

            const senderInfo: ParticipantSearchInfo = {
                userId: sender._id.toString(),
                firstName: sender.firstName,
                lastName: sender.lastName,
                userName: sender.userName,
                email: sender.email,
                profilePicture: sender.avatar || '',
                profession: sender.profession || '',
            };

            const receiverInfo: ParticipantSearchInfo = {
                userId: receiver._id.toString(),
                firstName: receiver.firstName,
                lastName: receiver.lastName,
                userName: receiver.userName,
                email: receiver.email,
                profilePicture: receiver.avatar || '',
                profession: receiver.profession || '',
            };

            chat = await this.chatModel.create({
                participants: [senderInfo, receiverInfo],
                messages: [],
                lastMessage: null,
            });

            // store chatId in both users
            await this.userModel.updateMany(
                { _id: { $in: [senderId, receiverId] } },
                { $push: { chats: chat._id } },
            );
        }

        return chat;
    }

    async addMessage(chatId: string, messageDto: AddMessageDto) {
        // Determine message type
        let messageType: 'text' | 'image' | 'file' = 'text';
        if (messageDto.mimeType) {
            if (messageDto.mimeType.startsWith('image/')) {
                messageType = 'image';
            } else {
                messageType = 'file';
            }
        } else if (messageDto.attachment) {
            const ext = messageDto.attachment.split('.').pop()?.toLowerCase();
            if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                messageType = 'image';
            } else {
                messageType = 'file';
            }
        }

        const createdAt = new Date();

        const chat = await this.chatModel.findByIdAndUpdate(
            chatId,
            {
                $push: {
                    messages: {
                        content: messageDto.content,
                        attachment: messageDto.attachment || '',
                        mimeType: messageDto.mimeType || '',
                        senderId: messageDto.senderId,
                        createdAt,
                    },
                },
                $set: {
                    lastMessage: {
                        senderId: messageDto.senderId,
                        content: messageDto.content,
                        createdAt,
                        type: messageType,
                    },
                },
            },
            { new: true },
        );

        if (!chat) return null;

        const senderId = messageDto.senderId;
        const participantIds = chat.participants.map(p => p.userId);
        const recipientIds = participantIds.filter(id => id !== senderId);

        // Increment unread counts
        for (const recipientId of recipientIds) {
            const recipient = await this.userModel.findById(recipientId);
            if (recipient) {
                if (!recipient.unreadCounts) {
                    recipient.unreadCounts = [];
                }
                const unreadIndex = recipient.unreadCounts.findIndex(uc => uc.chatId === chatId);
                if (unreadIndex >= 0) {
                    recipient.unreadCounts[unreadIndex].count += 1;
                } else {
                    recipient.unreadCounts.push({ chatId, count: 1 });
                }
                recipient.markModified('unreadCounts');
                await recipient.save();
            }
        }

        // Prepare message payload
        const messagePayload = {
            content: messageDto.content,
            attachment: messageDto.attachment || '',
            mimeType: messageDto.mimeType || '',
            senderId,
            createdAt,
        };

        // Emit socket events
        if (this.chatGateway && this.chatGateway.server) {
            for (const userId of participantIds) {
                this.chatGateway.server.to(userId).emit('message:new', {
                    chatId,
                    message: messagePayload,
                });

                const otherParticipant = chat.participants.find(p => p.userId !== userId) || chat.participants[0];
                const otherUserObj = await this.userModel.findById(otherParticipant.userId);
                const isOnline = otherUserObj ? otherUserObj.online : false;

                let unreadCount = 0;
                if (userId !== senderId) {
                    const recipient = await this.userModel.findById(userId);
                    const unreadEntry = recipient?.unreadCounts?.find(uc => uc.chatId === chatId);
                    unreadCount = unreadEntry ? unreadEntry.count : 0;
                }

                const conversationPayload = {
                    id: chat._id.toString(),
                    participant: {
                        userId: otherParticipant.userId,
                        firstName: otherParticipant.firstName,
                        lastName: otherParticipant.lastName,
                        userName: otherParticipant.userName,
                        email: otherParticipant.email,
                        profilePicture: otherParticipant.profilePicture || '',
                        profession: otherParticipant.profession || '',
                        online: isOnline,
                        lastSeen: otherUserObj?.lastSeen ? otherUserObj.lastSeen.toISOString() : undefined,
                    },
                    lastMessage: {
                        content: messageDto.content,
                        createdAt: createdAt.toISOString(),
                        senderId: senderId,
                        type: messageType,
                    },
                    unreadCount,
                    updatedAt: (chat as any).updatedAt ? (chat as any).updatedAt.toISOString() : new Date().toISOString(),
                };

                this.chatGateway.server.to(userId).emit('conversation:updated', conversationPayload);
            }
        }

        return chat;
    }

    async getMyConversations(userId: string, search?: string) {
        const query: any = {
            "participants.userId": userId,
        };

        if (search) {
            const regex = new RegExp(search, 'i');
            query.participants = {
                $elemMatch: {
                    userId: { $ne: userId },
                    $or: [
                        { firstName: regex },
                        { lastName: regex },
                        { userName: regex },
                        { email: regex },
                    ],
                },
            };
        }

        const chats = await this.chatModel.find(query).sort({ updatedAt: -1 });
        const user = await this.userModel.findById(userId);

        const otherUserIds = chats.map(chat => {
            const other = chat.participants.find(p => p.userId !== userId) || chat.participants[0];
            return other.userId;
        });
        const otherUsers = await this.userModel.find({ _id: { $in: otherUserIds } });
        const onlineMap = new Map<string, boolean>();
        const lastSeenMap = new Map<string, Date | null>();
        for (const u of otherUsers) {
            onlineMap.set(u._id.toString(), u.online ?? false);
            lastSeenMap.set(u._id.toString(), u.lastSeen ?? null);
        }

        return chats.map((chat) => {
            const otherParticipant = chat.participants.find(p => p.userId !== userId) || chat.participants[0];
            const unreadEntry = user?.unreadCounts?.find(uc => uc.chatId === chat._id.toString());
            const unreadCount = unreadEntry ? unreadEntry.count : 0;
            const isOnline = onlineMap.get(otherParticipant.userId) ?? false;
            const lastSeenDate = lastSeenMap.get(otherParticipant.userId);

            return {
                id: chat._id.toString(),
                participant: {
                    userId: otherParticipant.userId,
                    firstName: otherParticipant.firstName,
                    lastName: otherParticipant.lastName,
                    userName: otherParticipant.userName,
                    email: otherParticipant.email,
                    profilePicture: otherParticipant.profilePicture || '',
                    profession: otherParticipant.profession || '',
                    online: isOnline,
                    lastSeen: lastSeenDate ? lastSeenDate.toISOString() : undefined,
                },
                lastMessage: chat.lastMessage ? {
                    content: chat.lastMessage.content,
                    createdAt: chat.lastMessage.createdAt.toISOString(),
                    senderId: chat.lastMessage.senderId,
                    type: chat.lastMessage.type,
                } : null,
                unreadCount,
                updatedAt: (chat as any).updatedAt ? (chat as any).updatedAt.toISOString() : new Date().toISOString(),
            };
        });
    }

    async markAsRead(chatId: string, userId: string) {
        const user = await this.userModel.findById(userId);
        if (user && user.unreadCounts) {
            const unreadIndex = user.unreadCounts.findIndex(uc => uc.chatId === chatId);
            if (unreadIndex >= 0) {
                user.unreadCounts[unreadIndex].count = 0;
                user.markModified('unreadCounts');
                await user.save();
            }
        }

        const chat = await this.chatModel.findById(chatId);
        if (chat && this.chatGateway && this.chatGateway.server) {
            // Emit to ALL participants of this chat so they can clear unread counts locally in real time
            for (const participant of chat.participants) {
                this.chatGateway.server.to(participant.userId).emit('chat:read', {
                    chatId,
                    userId,
                });
            }
        }

        return { success: true };
    }

    async getChatById(chatId: string, page?: number, limit?: number) {
        const chat = await this.chatModel.findById(chatId);
        if (!chat) return null;

        if (page !== undefined && limit !== undefined) {
            const pageNum = Number(page);
            const limitNum = Number(limit);
            
            const totalMessages = chat.messages.length;
            const startIdx = Math.max(0, totalMessages - pageNum * limitNum);
            const endIdx = totalMessages - (pageNum - 1) * limitNum;
            
            // Slice the messages for the page
            const paginatedMessages = chat.messages.slice(startIdx, endIdx);
            
            const chatObject = chat.toObject();
            chatObject.messages = paginatedMessages;
            (chatObject as any).hasMore = startIdx > 0;
            return chatObject;
        }

        return chat;
    }
}