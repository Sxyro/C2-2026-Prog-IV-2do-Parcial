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
import { CrearComentarioDto } from './dto/crear-comentario.dto';
import { ListarComentariosDto } from './dto/listar-comentarios.dto';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto';
import { Publicacion, PublicacionDocument } from './schemas/publicacion.schema';

export interface PaginaPublicaciones {
  items: object[];
  total: number;
  offset: number;
  limit: number;
}

export interface PaginaComentarios {
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
      comentarios: [],
      comentariosCount: publicacion.comentarios.length,
      createdAt: publicacion.createdAt,
    }));

    const total = await this.publicacionModel.countDocuments(filtro);
    return { items, total, offset: filtros.offset, limit: filtros.limit };
  }

  async obtener(id: string, usuarioId?: string) {
    this.validarId(id);
    const publicacion = await this.publicacionModel
      .findOne({ _id: id, activa: true })
      .populate('usuario', 'nombre apellido username imagenPerfil')
      .lean();

    if (!publicacion) {
      throw new NotFoundException('No se encontró la publicación');
    }

    return {
      _id: String(publicacion._id),
      titulo: publicacion.titulo,
      descripcion: publicacion.descripcion,
      imagen: publicacion.imagen,
      usuario: publicacion.usuario,
      likesCount: publicacion.likes.length,
      likedByMe: usuarioId
        ? publicacion.likes.some((likeId) => String(likeId) === usuarioId)
        : false,
      comentarios: [],
      comentariosCount: publicacion.comentarios.length,
      createdAt: publicacion.createdAt,
    };
  }

  async listarComentarios(
    id: string,
    filtros: ListarComentariosDto,
  ): Promise<PaginaComentarios> {
    this.validarId(id);
    const publicacion = await this.publicacionModel
      .findOne({ _id: id, activa: true })
      .select('comentarios')
      .populate('comentarios.usuario', 'imagenPerfil')
      .lean();

    if (!publicacion) {
      throw new NotFoundException('No se encontró la publicación');
    }

    const comentarios = [...publicacion.comentarios].sort(
      (a, b) =>
        (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0) ||
        String(b._id).localeCompare(String(a._id)),
    );
    const items = comentarios
      .slice(filtros.offset, filtros.offset + filtros.limit)
      .map((comentario) => {
        const autor = comentario.usuario;
        const imagenPerfil =
          typeof autor === 'object' &&
          autor !== null &&
          'imagenPerfil' in autor &&
          typeof autor.imagenPerfil === 'string'
            ? autor.imagenPerfil
            : '';
        const usuario =
          typeof autor === 'object' && autor !== null && '_id' in autor
            ? String(autor._id)
            : String(autor);

        return {
          username: comentario.username,
          imagenPerfil,
          texto: comentario.texto,
          createdAt: comentario.createdAt,
          modificado: comentario.modificado,
          _id: String(comentario._id),
          usuario,
        };
      });

    return {
      items,
      total: comentarios.length,
      offset: filtros.offset,
      limit: filtros.limit,
    };
  }

  async crearComentario(
    id: string,
    datos: CrearComentarioDto,
    usuario: UsuarioDocument,
  ) {
    this.validarId(id);
    const publicacion = await this.publicacionModel.findOneAndUpdate(
      { _id: id, activa: true },
      {
        $push: {
          comentarios: {
            usuario: usuario._id,
            username: usuario.username,
            texto: datos.texto.trim(),
            createdAt: new Date(),
            modificado: false,
          },
        },
      },
      { new: true, projection: { comentarios: { $slice: -1 } } },
    );

    if (!publicacion) {
      throw new NotFoundException('No se encontró la publicación');
    }

    const comentario = publicacion.comentarios[0];
    return {
      _id: String(comentario._id),
      usuario: String(comentario.usuario),
      username: comentario.username,
      imagenPerfil: usuario.imagenPerfil || '',
      texto: comentario.texto,
      createdAt: comentario.createdAt,
      modificado: comentario.modificado,
    };
  }

  async actualizarComentario(
    id: string,
    comentarioId: string,
    datos: CrearComentarioDto,
    usuario: UsuarioDocument,
  ) {
    this.validarId(id);
    if (!isValidObjectId(comentarioId)) {
      throw new BadRequestException(
        'El identificador del comentario no es válido',
      );
    }

    const publicacion = await this.buscarActiva(id);
    const comentario = publicacion.comentarios.find(
      (item) => String(item._id) === comentarioId,
    );

    if (!comentario) {
      throw new NotFoundException('No se encontró el comentario');
    }
    if (String(comentario.usuario) !== String(usuario._id)) {
      throw new ForbiddenException(
        'Solo quien escribió el comentario puede modificarlo',
      );
    }

    comentario.texto = datos.texto.trim();
    comentario.modificado = true;
    await publicacion.save();

    return {
      _id: String(comentario._id),
      usuario: String(comentario.usuario),
      username: comentario.username,
      imagenPerfil: usuario.imagenPerfil || '',
      texto: comentario.texto,
      createdAt: comentario.createdAt,
      modificado: comentario.modificado,
    };
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
