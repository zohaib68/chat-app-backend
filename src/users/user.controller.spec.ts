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

    // Mock guard (always allow access)
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
            // override guard globally
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
    // CREATE USER TEST
    // -----------------------------
    describe('createUser', () => {
        it('should call userService.createUser with correct data', async () => {
            const dto: CreateUserDto = {
                firstName: 'John',
                lastName: 'Doe',
                userName: 'johndoe',
                email: 'john@gmail.com',
                password: '123456',
            };

            const resultMock = { _id: '1', ...dto };

            mockUserService.createUser.mockResolvedValue(resultMock);

            const result = await controller.createUser(dto);

            expect(service.createUser).toHaveBeenCalledWith(dto);
            expect(result).toEqual(resultMock);
        });
    });

    // -----------------------------
    // GET USERS TEST
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