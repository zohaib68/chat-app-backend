import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './create-users-dto';
import { UpdateUserDto } from './update-user.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async createUser(data: CreateUserDto) {
        const existingUser = await this.findUser({
            email: data.email,
            userName: data.userName,
        });

        if (existingUser) {
            throw new BadRequestException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        data.password = hashedPassword;

        return this.userModel.create({ ...data, currentToken: '' });
    }

    async getUsers() {
        return this.userModel.find();
    }

    async findUser(filter: Partial<{
        email: string;
        userName: string;
        firstName: string;
        lastName: string;
    }>) {
        return this.userModel.findOne(filter);
    }

    // 🔥 NEW: reusable update method
    async updateUserById(id: string, data: Partial<UpdateUserDto>) {
        if (!Object.keys(data).length) {
            throw new BadRequestException('No data provided for update');
        }

        // optional: prevent email duplication
        if (data.email) {
            const existing = await this.findUser({ email: data.email });
            if (existing && existing._id.toString() !== id) {
                throw new BadRequestException('Email already in use');
            }
        }

        return this.userModel.findByIdAndUpdate(
            id,
            { $set: data },
            {
                new: true,
                runValidators: true,
            },
        );
    }
}