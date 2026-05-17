import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './create-users-dto';
import { JwtDbAuthGuard } from '../auth/jwt-auth.guard';

describe('UserController', () => {
    let controller: UserController;
    let service: UserService;

    const mockUserService = {
        createUser: jest.fn(),
        getUsers: jest.fn(),
    };

    const mockJwtGuard = {
        canActivate: jest.fn(() => true),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
            ],
        })
            .overrideGuard(JwtDbAuthGuard)
            .useValue(mockJwtGuard)
            .compile();

        controller = module.get<UserController>(UserController);
        service = module.get<UserService>(UserService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // -----------------------------
    // CREATE USER TEST (UPDATED)
    // -----------------------------
    describe('createUser', () => {
        it('should call userService.createUser with dto and file', async () => {
            const dto: CreateUserDto = {
                firstName: 'John',
                lastName: 'Doe',
                userName: 'johndoe',
                email: 'john@gmail.com',
                password: '123456',
                phone: '1234567890',
            };

            const mockFile: Express.Multer.File = {
                originalname: 'avatar.png',
                mimetype: 'image/png',
                buffer: Buffer.from('fake-image'),
            } as any;

            const resultMock = {
                _id: '1',
                ...dto,
                avatar: 'https://supabase-url.com/avatar.png',
            };

            mockUserService.createUser.mockResolvedValue(resultMock);

            const result = await controller.createUser(dto, mockFile);

            expect(service.createUser).toHaveBeenCalledWith(dto, mockFile);
            expect(result).toEqual(resultMock);
        });

        it('should call userService.createUser without file', async () => {
            const dto: CreateUserDto = {
                firstName: 'John',
                lastName: 'Doe',
                userName: 'johndoe',
                email: 'john@gmail.com',
                password: '123456',
                phone: '1234567890',
            };

            const resultMock = {
                _id: '1',
                ...dto,
                avatar: '',
            };

            mockUserService.createUser.mockResolvedValue(resultMock);

            const result = await controller.createUser(dto, undefined);

            expect(service.createUser).toHaveBeenCalledWith(dto, undefined);
            expect(result).toEqual(resultMock);
        });
    });

    // -----------------------------
    // GET USERS TEST (UNCHANGED)
    // -----------------------------
    describe('getUsers', () => {
        it('should return list of users', async () => {
            const usersMock = [
                { _id: '1', email: 'a@gmail.com' },
                { _id: '2', email: 'b@gmail.com' },
            ];

            mockUserService.getUsers.mockResolvedValue(usersMock);

            const result = await controller.getUsers();

            expect(service.getUsers).toHaveBeenCalled();
            expect(result).toEqual(usersMock);
        });
    });
});