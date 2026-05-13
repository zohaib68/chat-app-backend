import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './create-users-dto';
import { JwtDbAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }
    @Post('create')
    createUser(
        @Body() body: CreateUserDto,
    ) {
        return this.userService.createUser(body);
    }

    @UseGuards(JwtDbAuthGuard)
    @Get()
    getUsers() {
        return this.userService.getUsers();
    }
}