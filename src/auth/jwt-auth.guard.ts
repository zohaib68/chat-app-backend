import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { Request } from 'express';

@Injectable()
export class JwtDbAuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        const authHeader = request.headers.authorization;

        if (!authHeader) throw new UnauthorizedException('No token');

        const token = authHeader.split(' ')[1];

        if (!token) throw new UnauthorizedException('Invalid token');

        try {
            // 1. verify token
            const payload = await this.jwtService.verifyAsync(token);

            // 2. find user in DB
            const user = await this.userModel.findById(payload.sub);

            if (!user) throw new UnauthorizedException('User not found');

            // 3. compare token with DB stored token
            if (user.currentToken !== token) {
                throw new UnauthorizedException('Token expired or invalid');
            }

            // 4. attach user
            request.user = user;

            return true;
        } catch (err) {
            throw new UnauthorizedException('Unauthorized');
        }
    }
}