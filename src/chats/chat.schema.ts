import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatDocument = HydratedDocument<Chat>;

@Schema({ _id: false })
export class ParticipantSearchInfo {
    @Prop({ required: true })
    userId: string;

    @Prop({ required: true })
    firstName: string;

    @Prop({ required: true })
    lastName: string;

    @Prop({ required: true })
    userName: string;

    @Prop({ required: true })
    email: string;

    @Prop({ default: '' })
    profilePicture?: string;

    @Prop({ default: '' })
    profession?: string;
}

export const ParticipantSearchInfoSchema = SchemaFactory.createForClass(ParticipantSearchInfo);

@Schema({ _id: false })
export class LastMessage {
    @Prop({ required: true })
    senderId: string;

    @Prop({ required: true })
    content: string;

    @Prop({ required: true, type: Date })
    createdAt: Date;

    @Prop({ required: true, type: String, enum: ['text', 'image', 'file'] })
    type: 'text' | 'image' | 'file';
}

export const LastMessageSchema = SchemaFactory.createForClass(LastMessage);

@Schema({ timestamps: true })
export class Chat {
    @Prop({ type: [ParticipantSearchInfoSchema], required: true })
    participants: ParticipantSearchInfo[];

    @Prop({ type: LastMessageSchema, default: null })
    lastMessage: LastMessage | null;

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