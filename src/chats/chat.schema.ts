import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatDocument = HydratedDocument<Chat>;

@Schema({ timestamps: true })
export class Chat {
    @Prop({ type: [String], required: true }) // userIds
    participants: string[];

    @Prop([
        {
            content: String,
            attachment: String,
            mimeType: String,
            senderId: String,
            createdAt: { type: Date, default: Date.now },
        },
    ])
    messages: {
        content: string;
        attachment: string;
        mimeType: string;
        senderId: string;
        createdAt?: Date;
    }[];
}

export const ChatSchema = SchemaFactory.createForClass(Chat);