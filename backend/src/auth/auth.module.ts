import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { CloudinaryService } from './cloudinary.service';
import { AuthGuard, OptionalAuthGuard } from './auth.guard';
import { SessionService } from './session.service';

@Module({
  imports: [
    UsuariosModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('AUTH_TOKEN_SECRET');
        if (secret.length < 32) {
          throw new Error('AUTH_TOKEN_SECRET debe tener al menos 32 caracteres');
        }

        return {
          secret,
          signOptions: {
            algorithm: 'HS256',
            expiresIn: SessionService.tokenTtlSeconds,
          },
          verifyOptions: {
            algorithms: ['HS256'],
          },
        };
      },
    }),
  ],
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
