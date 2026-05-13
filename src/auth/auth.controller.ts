import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { JwtDbAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    login(
        @Body() body: LoginDto,
    ) {
        return this.authService.login(body.email, body.password);
    }

    @UseGuards(JwtDbAuthGuard)
    @Post('logout')
    logout(@Req() req) {
        return this.authService.logout(req.user._id);
    }
}