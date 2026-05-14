import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UploadService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async uploadToSupabase(file: Express.Multer.File) {
        const supabase = this.supabaseService.getClient();
        const bucket = this.supabaseService.getBucket();

        const fileExt = file.originalname.split('.').pop();
        const fileName = `uploads/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (error) {
            throw new BadRequestException(error.message);
        }

        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return {
            url: data.publicUrl,
            fileName,
            mimeType: file.mimetype,
        };
    }
}