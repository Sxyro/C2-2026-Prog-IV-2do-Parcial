import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { AuthGuard, OptionalAuthGuard } from '../auth/auth.guard';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto';
import {
  PaginaPublicaciones,
  PublicacionesService,
} from './publicaciones.service';

type AuthenticatedRequest = Request & { user?: UsuarioDocument };

@Controller('publicaciones')
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('imagen', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  crear(
    @Body() datos: CrearPublicacionDto,
    @Req() request: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    imagen?: Express.Multer.File,
  ) {
    return this.publicacionesService.crear(datos, request.user!, imagen);
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  listar(
    @Query() filtros: ListarPublicacionesDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginaPublicaciones> {
    return this.publicacionesService.listar(
      filtros,
      request.user ? String(request.user._id) : undefined,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  eliminar(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.publicacionesService.eliminar(id, request.user!);
  }

  @Post(':id/likes')
  @UseGuards(AuthGuard)
  darLike(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.publicacionesService.darLike(id, request.user!);
  }

  @Delete(':id/likes')
  @UseGuards(AuthGuard)
  quitarLike(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.publicacionesService.quitarLike(id, request.user!);
  }
}
