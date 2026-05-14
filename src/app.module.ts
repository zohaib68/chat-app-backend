import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Connect MongoDB
    MongooseModule.forRoot(process.env.MONGODB_URI as string),
    UsersModule,
    AuthModule,
    UploadModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }