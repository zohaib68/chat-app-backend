import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../users/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UserService,
        private jwtService: JwtService,
    ) { }

    async login(email: string, password: string) {
        const user = await this.usersService.findUser({ email: email });

        if (!user) throw new UnauthorizedException();

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new UnauthorizedException();

        const payload = {
            sub: user._id,
            email: user.email,
        };

        const token = this.jwtService.sign(payload);

        // ✅ STORE TOKEN IN DB
        user.currentToken = token;
        await user.save();

        return { access_token: token };
    }

    async logout(userId: string) {
        await this.usersService.updateUserById(
            userId,
            {
                currentToken: '',
            },
        );

        return {
            message: 'Logged out successfully',
        };
    }
}