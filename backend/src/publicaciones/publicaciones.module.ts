import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { CloudinaryService } from '../auth/cloudinary.service';
import { PublicacionesController } from './publicaciones.controller';
import { PublicacionesService } from './publicaciones.service';
import {
  Publicacion,
  PublicacionSchema,
} from './schemas/publicacion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
    ]),
    AuthModule,
    UsuariosModule,
  ],
  controllers: [PublicacionesController],
  providers: [PublicacionesService, CloudinaryService],
})
export class PublicacionesModule {}
