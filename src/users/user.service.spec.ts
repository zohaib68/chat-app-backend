import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.schema';

describe('UserService', () => {
    let service: UserService;
    let model: any;

    const mockUserModel = {
        create: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getModelToken(User.name),
                    useValue: mockUserModel,
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        model = module.get(getModelToken(User.name));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // -----------------------------
    // CREATE USER TEST
    // -----------------------------
    describe('createUser', () => {
        it('should create a user if email does not exist', async () => {
            model.findOne.mockResolvedValue(null);
            model.create.mockResolvedValue({ _id: '1', email: 'test@gmail.com' });

            const result = await service.createUser({
                firstName: 'John',
                lastName: 'Doe',
                userName: 'johndoe',
                email: 'test@gmail.com',
                password: '123456',
                phone: '1234567890',
            });

            expect(model.findOne).toHaveBeenCalledWith({
                email: 'test@gmail.com',
            });

            expect(model.create).toHaveBeenCalled();
            expect(result).toEqual({ _id: '1', email: 'test@gmail.com' });
        });

        it('should throw error if user already exists', async () => {
            model.findOne.mockResolvedValue({ email: 'test@gmail.com' });

            await expect(
                service.createUser({
                    firstName: 'John',
                    lastName: 'Doe',
                    userName: 'johndoe',
                    email: 'test@gmail.com',
                    password: '123456',
                    phone: '1234567890',
                }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    // -----------------------------
    // FIND USER TEST
    // -----------------------------
    describe('findUser', () => {
        it('should return a user by filter', async () => {
            model.findOne.mockResolvedValue({ email: 'test@gmail.com' });

            const result = await service.findUser({ email: 'test@gmail.com' });

            expect(model.findOne).toHaveBeenCalledWith({
                email: 'test@gmail.com',
            });

            expect(result).toEqual({ email: 'test@gmail.com' });
        });
    });

    // -----------------------------
    // UPDATE USER TEST
    // -----------------------------
    describe('updateUserById', () => {
        it('should update user successfully', async () => {
            model.findByIdAndUpdate.mockResolvedValue({
                _id: '1',
                firstName: 'Updated',
            });

            const result = await service.updateUserById('1', {
                firstName: 'Updated',
            });

            expect(model.findByIdAndUpdate).toHaveBeenCalled();
            expect(result).toEqual({ _id: '1', firstName: 'Updated' });
        });

        it('should throw error if no data provided', async () => {
            await expect(
                service.updateUserById('1', {}),
            ).rejects.toThrow(BadRequestException);
        });
    });
});