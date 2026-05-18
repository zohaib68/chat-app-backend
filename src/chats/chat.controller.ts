import { Controller, Get, Post, Param, Query, UseGuards, Req, NotFoundException, Body, UnauthorizedException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtDbAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chats')
@UseGuards(JwtDbAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('my-conversations')
    async getMyConversations(@Req() req, @Query('search') search?: string) {
        const userId = req.user._id.toString();
        return this.chatService.getMyConversations(userId, search);
    }

    @Post()
    async createChat(@Req() req, @Body('receiverId') receiverId: string) {
        const senderId = req.user._id.toString();
        return this.chatService.findOrCreateChat(senderId, receiverId);
    }

    @Get(':chatId')
    async getChat(
        @Req() req, 
        @Param('chatId') chatId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        const chat = await this.chatService.getChatById(chatId, page, limit);
        if (!chat) {
            throw new NotFoundException('Chat not found');
        }
        // Verify user is a participant of this chat
        const userId = req.user._id.toString();
        const isParticipant = chat.participants.some(p => p.userId === userId);
        if (!isParticipant) {
            throw new UnauthorizedException('You are not a participant of this chat');
        }
        return chat;
    }

    @Post(':chatId/read')
    async markAsRead(@Req() req, @Param('chatId') chatId: string) {
        const userId = req.user._id.toString();
        return this.chatService.markAsRead(chatId, userId);
    }
}

