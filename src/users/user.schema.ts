import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, trim: true })
    firstName: string;

    @Prop({ required: true, trim: true })
    lastName: string;

    @Prop({ required: true, unique: true, trim: true })
    userName: string;

    @Prop({ required: true, unique: true, trim: true })
    email: string;

    @Prop({ required: true, unique: true, trim: true })
    phone: string;

    @Prop({ required: true })
    password: string;

    @Prop({ default: '' })
    currentToken: string;

    // =========================
    // PROFILE FIELDS
    // =========================

    @Prop({ default: '' })
    description: string;

    @Prop({ default: '', index: true })
    city: string;

    @Prop({ default: '', index: true })
    country: string;

    @Prop({ default: '', index: true })
    profession: string;

    // Supabase / Cloud image URL
    @Prop({ default: '' })
    avatar: string;

    @Prop({ default: [] })
    chats: string[];

    @Prop({
      type: [
        {
          chatId: String,
          count: Number,
        },
      ],
      default: [],
    })
    unreadCounts: {
      chatId: string;
      count: number;
    }[];

    @Prop({ default: false })
    online: boolean;

    @Prop({ type: Date, default: null })
    lastSeen: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);