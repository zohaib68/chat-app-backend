import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat, ChatDocument } from './chat.schema';
import { User, UserDocument } from '../users/user.schema';
import { AddMessageDto } from './add-message-dto';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async findOrCreateChat(senderId: string, receiverId: string) {
        let chat = await this.chatModel.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!chat) {
            chat = await this.chatModel.create({
                participants: [senderId, receiverId],
                messages: [],
            });

            // store chatId in both users
            await this.userModel.updateMany(
                { _id: { $in: [senderId, receiverId] } },
                { $push: { chats: chat._id } },
            );
        }

        return chat;
    }

    async addMessage(chatId: string, message: AddMessageDto) {
        return this.chatModel.findByIdAndUpdate(
            chatId,
            {
                $push: {
                    messages: {
                        content: message.content,
                        attachment: message.attachment || '',
                        mimeType: message.mimeType || '',
                        senderId: message.senderId,
                        createdAt: new Date(),
                    },
                },
            },
            { new: true },
        );
    }
}