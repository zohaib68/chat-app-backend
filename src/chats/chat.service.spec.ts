import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { Chat } from './chat.schema';
import { User } from '../users/user.schema';
import { AddMessageDto } from './add-message-dto';

describe('ChatService', () => {
    let service: ChatService;

    const mockChatModel = {
        findOne: jest.fn(),
        create: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    };

    const mockUserModel = {
        updateMany: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatService,
                {
                    provide: getModelToken(Chat.name),
                    useValue: mockChatModel,
                },
                {
                    provide: getModelToken(User.name),
                    useValue: mockUserModel,
                },
            ],
        }).compile();

        service = module.get<ChatService>(ChatService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // -----------------------------
    // FIND OR CREATE CHAT
    // -----------------------------
    describe('findOrCreateChat', () => {
        it('should return existing chat if found', async () => {
            const existingChat = {
                _id: 'chat1',
                participants: ['u1', 'u2'],
            };

            mockChatModel.findOne.mockResolvedValue(existingChat);

            const result = await service.findOrCreateChat('u1', 'u2');

            expect(mockChatModel.findOne).toHaveBeenCalledWith({
                participants: { $all: ['u1', 'u2'] },
            });

            expect(mockChatModel.create).not.toHaveBeenCalled();
            expect(mockUserModel.updateMany).not.toHaveBeenCalled();
            expect(result).toEqual(existingChat);
        });

        it('should create new chat if not found', async () => {
            const newChat = {
                _id: 'chat2',
                participants: ['u1', 'u2'],
                messages: [],
            };

            mockChatModel.findOne.mockResolvedValue(null);
            mockChatModel.create.mockResolvedValue(newChat);

            const result = await service.findOrCreateChat('u1', 'u2');

            expect(mockChatModel.create).toHaveBeenCalledWith({
                participants: ['u1', 'u2'],
                messages: [],
            });

            expect(mockUserModel.updateMany).toHaveBeenCalledWith(
                { _id: { $in: ['u1', 'u2'] } },
                { $push: { chats: newChat._id } },
            );

            expect(result).toEqual(newChat);
        });
    });

    // -----------------------------
    // ADD MESSAGE
    // -----------------------------
    describe('addMessage', () => {
        it('should add message to chat', async () => {
            const chatId = 'chat1';

            const message = {
                content: 'hello',
                attachment: '',
                mimeType: '',
                senderId: 'u1',
            };

            const updatedChat = {
                _id: chatId,
                messages: [message],
            };

            mockChatModel.findByIdAndUpdate.mockResolvedValue(updatedChat);

            const result = await service.addMessage(chatId, message as AddMessageDto);

            expect(mockChatModel.findByIdAndUpdate).toHaveBeenCalledWith(
                chatId,
                { $push: { messages: message } },
                { new: true },
            );

            expect(result).toEqual(updatedChat);
        });
    });
});