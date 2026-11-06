import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>(
        'CLOUDINARY_CLOUD_NAME',
      ),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>(
        'CLOUDINARY_API_SECRET',
      ),
      secure: true,
    });
  }

  async subirImagen(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const flujo = cloudinary.uploader.upload_stream(
        {
          folder: 'mannboard/perfiles',
          resource_type: 'image',
        },
        (error, resultado) => {
          if (error || !resultado) {
            reject(error ?? new Error('No se pudo subir la imagen'));
            return;
          }

          resolve(resultado.secure_url);
        },
      );

      flujo.end(buffer);
    });
  }
}
