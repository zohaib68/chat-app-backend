// create-user.dto.ts
import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    lastName: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(30)
    userName: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    // Optional profile fields
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    profession?: string;

    @IsOptional()
    @IsString()
    currentToken?: string;

    // Avatar URL
    @IsOptional()
    @IsUrl()
    avatar?: string;
}

export class UpdateUserDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastName?: string;

    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(30)
    userName?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    profession?: string;
}