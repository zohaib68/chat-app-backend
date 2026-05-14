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

    @Prop({ required: true, select: false })
    password: string;

    @Prop({ default: '' })
    currentToken: string;

    // =========================
    // PROFILE FIELDS
    // =========================

    @Prop({ default: '' })
    description: string;

    @Prop({ default: '' })
    city: string;

    @Prop({ default: '' })
    country: string;

    @Prop({ default: '' })
    profession: string;

    // Supabase / Cloud image URL
    @Prop({ default: '' })
    avatar: string;
}

export const UserSchema = SchemaFactory.createForClass(User);