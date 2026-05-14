import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '../auth/auth.module';
import { SupabaseService } from 'src/supabase/supabase.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
        ]),
        forwardRef(() => AuthModule),
    ],
    controllers: [UserController],
    providers: [UserService, SupabaseService],
    exports: [UserService, MongooseModule]
})
export class UsersModule { }