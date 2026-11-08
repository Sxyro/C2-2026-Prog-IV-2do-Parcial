import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { CloudinaryService } from './cloudinary.service';
import { AuthGuard, OptionalAuthGuard } from './auth.guard';
import { SessionService } from './session.service';

@Module({
  imports: [UsuariosModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    CloudinaryService,
    SessionService,
    AuthGuard,
    OptionalAuthGuard,
  ],
  exports: [SessionService, AuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
