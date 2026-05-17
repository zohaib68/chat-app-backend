import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { CreateUserDto, UpdateUserDto } from './create-users-dto';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from 'src/supabase/supabase.service';




@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private supabaseService: SupabaseService
    ) { }

    async createUser(data: CreateUserDto, file?: Express.Multer.File) {
        const existingUser = await this.findUser({
            email: data.email,
            userName: data.userName,
        });

        if (existingUser) {
            throw new BadRequestException('User already exists');
        }

        // 1. Upload avatar if exists
        let avatarUrl = '';

        if (file) {
            const supabase = this.supabaseService.getClient();
            const bucket = this.supabaseService.getBucket();

            const fileExt = file.originalname.split('.').pop();
            const fileName = `avatars/${Date.now()}.${fileExt}`;

            const { error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true,
                });

            if (error) {
                throw new BadRequestException(error.message);
            }

            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            avatarUrl = publicUrlData.publicUrl;
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // 3. Create user
        return this.userModel.create({
            ...data,
            password: hashedPassword,
            avatar: avatarUrl, // 👈 store Supabase URL
            currentToken: '',
        });
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

    async findUserById(id: string) {
        return this.userModel.findById(id);
    }

    // 🔥 NEW: reusable update method
    async updateUserById(
        id: string,
        data: Partial<CreateUserDto>,
        file?: Express.Multer.File,
    ) {
        if (!Object.keys(data).length && !file) {
            throw new BadRequestException('No data provided for update');
        }

        const user = await this.userModel.findById(id);

        if (!user) {
            throw new BadRequestException('User not found');
        }

        // =========================
        // 1. EMAIL DUPLICATION CHECK
        // =========================
        if (data.email) {
            const existing = await this.findUser({ email: data.email });

            if (existing && existing._id.toString() !== id) {
                throw new BadRequestException('Email already in use');
            }
        }

        // =========================
        // 2. HANDLE AVATAR UPLOAD
        // =========================
        let avatarUrl = user.avatar;

        if (file) {
            const supabase = this.supabaseService.getClient();
            const bucket = this.supabaseService.getBucket();

            const fileExt = file.originalname.split('.').pop();
            const fileName = `${id}/${Date.now()}.${fileExt}`;

            const { error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true,
                });

            if (error) {
                throw new BadRequestException(error.message);
            }

            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            avatarUrl = publicUrlData.publicUrl;
        }

        // Hash password if updating password
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }

        // =========================
        // 3. FINAL UPDATE PAYLOAD
        // =========================
        const updatePayload = {
            ...data,
            avatar: avatarUrl,
        };

        // =========================
        // 4. UPDATE USER
        // =========================
        return this.userModel.findByIdAndUpdate(
            id,
            { $set: updatePayload },
            {
                new: true,
                runValidators: true,
            },
        );
    }
    async uploadAvatar(file: Express.Multer.File, userId: string) {
        const supabase = this.supabaseService.getClient();
        const bucket = this.supabaseService.getBucket();

        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        // 1. Upload to Supabase
        const { error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (error) throw new Error(error.message);

        // 2. Get public URL
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        const avatarUrl = data.publicUrl;

        // 3. Save to MongoDB
        await this.userModel.findByIdAndUpdate(userId, {
            avatar: avatarUrl,
        });

        return { avatar: avatarUrl };
    }

    async searchUsers(filters: {
        name?: string;
        profession?: string;
        city?: string;
        country?: string;
        date?: string;
    }) {
        const query: any = {};

        // 1. exact or indexed fields (matching case-insensitively for premium user matching)
        if (filters.profession) {
            query.profession = { $regex: new RegExp(`^${filters.profession}$`, 'i') };
        }
        if (filters.city) {
            query.city = { $regex: new RegExp(`^${filters.city}$`, 'i') };
        }
        if (filters.country) {
            query.country = { $regex: new RegExp(`^${filters.country}$`, 'i') };
        }

        // 2. Global search: matches firstName, lastName, userName, email
        if (filters.name) {
            const searchRegex = new RegExp(filters.name, 'i');
            query.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { userName: searchRegex },
                { email: searchRegex },
            ];
        }

        // 3. Registration date query
        if (filters.date) {
            const startDate = new Date(filters.date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(filters.date);
            endDate.setHours(23, 59, 59, 999);

            query.createdAt = {
                $gte: startDate,
                $lte: endDate,
            };
        }

        return this.userModel.find(query);
    }
}