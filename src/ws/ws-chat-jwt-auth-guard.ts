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

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client = context.switchToWs().getClient();

        const token =
            client.handshake?.auth?.token ||
            client.handshake?.headers?.authorization?.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            // 1. verify JWT
            const payload = this.jwtService.verify(token);

            // 2. check DB user
            const user = await this.userModel.findById(payload.sub);

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // 3. compare currentToken
            if (user.currentToken !== token) {
                throw new UnauthorizedException('Invalid session');
            }

            // 4. attach user to socket
            client.user = user;

            return true;
        } catch (err) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}