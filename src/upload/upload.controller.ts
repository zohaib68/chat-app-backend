import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('file')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|pdf|mp4)$/)) {
                    return cb(
                        new BadRequestException('Invalid file type'),
                        false,
                    );
                }
                cb(null, true);
            },
        }),
    )
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        return this.uploadService.uploadToSupabase(file);
    }
}