import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './create-users-dto';
import { JwtDbAuthGuard } from '../auth/jwt-auth.guard';
import { Param, Patch, NotFoundException, Query } from '@nestjs/common';


@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }


  @UseGuards(JwtDbAuthGuard)
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('Only image files allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.updateUserById(id, body, file);
  }

  @Post('create')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 2MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('Only image files allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  createUser(
    @Body() body: CreateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.createUser(body, file);
  }

  @UseGuards(JwtDbAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    const user = await this.userService.findUserById(req.user._id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const u = user as any;
    return {
      id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      userName: u.userName,
      email: u.email,
      description: u.description || '',
      country: u.country || '',
      city: u.city || '',
      profilePicture: u.avatar || '',
      profession: u.profession || '',
      online: u.online ?? false,
      lastSeen: u.lastSeen ?? null,
      createdAt: u.createdAt,
      phone: u.phone || '',
    };
  }

  @Get('search')
  async searchUsers(
    @Query('name') name?: string,
    @Query('profession') profession?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('date') date?: string,
  ) {
    const users = await this.userService.searchUsers({ name, profession, city, country, date });

    return users.map((u: any) => ({
      id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      userName: u.userName,
      email: u.email,
      description: u.description || '',
      country: u.country || '',
      city: u.city || '',
      profilePicture: u.avatar || '',
      profession: u.profession || '',
      online: u.online ?? false,
      lastSeen: u.lastSeen ?? null,
      createdAt: u.createdAt,
      phone: u.phone || '',
    }));
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.userService.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const u = user as any;
    return {
      id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      userName: u.userName,
      email: u.email,
      description: u.description || '',
      country: u.country || '',
      city: u.city || '',
      profilePicture: u.avatar || '',
      profession: u.profession || '',
      online: u.online ?? false,
      lastSeen: u.lastSeen ?? null,
      createdAt: u.createdAt,
      phone: u.phone || '',
    };
  }

  @Get()
  getUsers() {
    return this.userService.getUsers();
  }
}