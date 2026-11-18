import {
  Body,
  Controller,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { TokenDto } from './dto/token.dto';
import { AuthGuard } from './auth.guard';
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { ActualizarPerfilDto } from '../usuarios/dto/actualizar-perfil.dto';

type AuthenticatedRequest = Request & {
  user?: UsuarioDocument;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(
    FileInterceptor('imagenPerfil', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  registrar(
    @Body() datos: RegistroDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    imagenPerfil?: Express.Multer.File,
  ) {
    return this.authService.registrar(datos, imagenPerfil);
  }

  @Post('login')
  iniciarSesion(@Body() datos: LoginDto) {
    return this.authService.iniciarSesion(datos);
  }

  @Post('authorize')
  autorizar(@Body() datos: TokenDto) {
    return this.authService.autorizar(datos.token);
  }

  @Post('refresh')
  refrescar(@Body() datos: TokenDto) {
    return this.authService.refrescar(datos.token);
  }

  @Put('perfil')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('imagenPerfil', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  actualizarPerfil(
    @Req() request: AuthenticatedRequest,
    @Body() datos: ActualizarPerfilDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    imagenPerfil?: Express.Multer.File,
  ) {
    if (!request.user) {
      throw new UnauthorizedException('Debés iniciar sesión');
    }

    return this.authService.actualizarPerfil(request.user, datos, imagenPerfil);
  }
}
