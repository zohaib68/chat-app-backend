import {
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class AddMessageDto {
    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    attachment?: string;

    @IsOptional()
    @IsString()
    mimeType?: string;

    @IsString()
    @IsNotEmpty()
    senderId: string;

    @IsString()
    @IsNotEmpty()
    receiverId: string;
}