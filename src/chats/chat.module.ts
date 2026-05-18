import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from '../ws/ws-chat-gateway';

import { Chat, ChatSchema } from './chat.schema';
import { User, UserSchema } from '../users/user.schema';
import { SupabaseService } from 'src/supabase/supabase.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Chat.name, schema: ChatSchema },
            { name: User.name, schema: UserSchema },
        ]),
        AuthModule,
    ],
    controllers: [ChatController],
    providers: [ChatService, ChatGateway, SupabaseService],
    exports: [ChatService],
})
export class ChatModule { }