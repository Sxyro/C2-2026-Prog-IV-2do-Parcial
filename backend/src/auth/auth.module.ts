import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [UsuariosModule],
  controllers: [AuthController],
  providers: [AuthService, CloudinaryService],
})
export class AuthModule {}
