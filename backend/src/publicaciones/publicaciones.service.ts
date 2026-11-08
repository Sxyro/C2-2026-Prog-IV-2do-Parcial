import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { CloudinaryService } from '../auth/cloudinary.service';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto';
import { Publicacion, PublicacionDocument } from './schemas/publicacion.schema';

export interface PaginaPublicaciones {
  items: object[];
  total: number;
  offset: number;
  limit: number;
}

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<PublicacionDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async crear(
    datos: CrearPublicacionDto,
    usuario: UsuarioDocument,
    imagen?: Express.Multer.File,
  ) {
    const imagenUrl = imagen
      ? await this.cloudinaryService.subirImagen(
          imagen.buffer,
          'publicaciones',
        )
      : '';
    const publicacion = await this.publicacionModel.create({
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      imagen: imagenUrl,
      usuario: usuario._id,
    });

    const creada = await this.publicacionModel
      .findById(publicacion._id)
      .populate('usuario', 'nombre apellido username imagenPerfil')
      .lean();
    return creada;
  }

  async listar(
    filtros: ListarPublicacionesDto,
    usuarioId?: string,
  ): Promise<PaginaPublicaciones> {
    const filtro = {
      activa: true,
      ...(filtros.usuarioId
        ? { usuario: new Types.ObjectId(filtros.usuarioId) }
        : {}),
    };

    const publicaciones =
      filtros.orden === 'likes'
        ? await this.publicacionModel.aggregate([
            { $match: filtro },
            {
              $addFields: {
                likesCount: { $size: { $ifNull: ['$likes', []] } },
              },
            },
            { $sort: { likesCount: -1, createdAt: -1 } },
            { $skip: filtros.offset },
            { $limit: filtros.limit },
          ])
        : await this.publicacionModel
            .find(filtro)
            .sort({ createdAt: -1 })
            .skip(filtros.offset)
            .limit(filtros.limit)
            .lean();
    const publicacionesConAutor = await this.publicacionModel.populate(
      publicaciones,
      { path: 'usuario', select: 'nombre apellido username imagenPerfil' },
    );

    const items = publicacionesConAutor.map((publicacion) => ({
      _id: String(publicacion._id),
      titulo: publicacion.titulo,
      descripcion: publicacion.descripcion,
      imagen: publicacion.imagen,
      usuario: publicacion.usuario,
      likesCount: publicacion.likes.length,
      likedByMe: usuarioId
        ? publicacion.likes.some((id) => String(id) === usuarioId)
        : false,
      comentarios: publicacion.comentarios,
      createdAt: publicacion.createdAt,
    }));

    const total = await this.publicacionModel.countDocuments(filtro);
    return { items, total, offset: filtros.offset, limit: filtros.limit };
  }

  async eliminar(id: string, usuario: UsuarioDocument): Promise<void> {
    const publicacion = await this.buscarActiva(id);
    const esPropietario = String(publicacion.usuario) === String(usuario._id);
    const esAdministrador = usuario.perfil === 'administrador';

    if (!esPropietario && !esAdministrador) {
      throw new ForbiddenException(
        'Solo el autor o un administrador pueden eliminar esta publicación',
      );
    }

    publicacion.activa = false;
    await publicacion.save();
  }

  async darLike(id: string, usuario: UsuarioDocument) {
    this.validarId(id);
    const publicacion = await this.publicacionModel.findOneAndUpdate(
      { _id: id, activa: true },
      { $addToSet: { likes: usuario._id } },
      { new: true },
    );

    if (!publicacion) {
      throw new NotFoundException('No se encontró la publicación');
    }

    return { likesCount: publicacion.likes.length, likedByMe: true };
  }

  async quitarLike(id: string, usuario: UsuarioDocument) {
    this.validarId(id);
    const publicacion = await this.publicacionModel.findOneAndUpdate(
      { _id: id, activa: true, likes: usuario._id },
      { $pull: { likes: usuario._id } },
      { new: true },
    );

    if (!publicacion) {
      const existe = await this.publicacionModel.exists({
        _id: id,
        activa: true,
      });

      if (!existe) {
        throw new NotFoundException('No se encontró la publicación');
      }

      throw new ConflictException('No habías dado me gusta a esta publicación');
    }

    return { likesCount: publicacion.likes.length, likedByMe: false };
  }

  private async buscarActiva(id: string): Promise<PublicacionDocument> {
    this.validarId(id);

    const publicacion = await this.publicacionModel.findOne({
      _id: id,
      activa: true,
    });

    if (!publicacion) {
      throw new NotFoundException('No se encontró la publicación');
    }

    return publicacion;
  }

  private validarId(id: string): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        'El identificador de publicación no es válido',
      );
    }
  }
}
