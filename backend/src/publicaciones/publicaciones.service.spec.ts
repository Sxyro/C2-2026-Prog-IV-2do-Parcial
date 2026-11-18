import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { CloudinaryService } from '../auth/cloudinary.service';
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { PublicacionesService } from './publicaciones.service';
import { PublicacionDocument } from './schemas/publicacion.schema';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto';

describe('PublicacionesService', () => {
  const postId = '64b7f9e9aa4c7fce5d2f1234';
  const usuario = {
    _id: 'user-id',
    username: 'user',
    perfil: 'usuario',
  } as unknown as UsuarioDocument;
  let model: {
    findOneAndUpdate: jest.Mock;
    exists: jest.Mock;
    aggregate: jest.Mock;
    populate: jest.Mock;
    countDocuments: jest.Mock;
    findOne: jest.Mock;
  };
  let service: PublicacionesService;

  beforeEach(() => {
    model = {
      findOneAndUpdate: jest.fn(),
      exists: jest.fn(),
      aggregate: jest.fn().mockResolvedValue([]),
      populate: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
    };
    service = new PublicacionesService(
      model as unknown as Model<PublicacionDocument>,
      {} as CloudinaryService,
    );
  });

  it('adds a like atomically so a user cannot be counted twice', async () => {
    model.findOneAndUpdate.mockResolvedValue({
      likes: ['user-id'],
    });

    await expect(service.darLike(postId, usuario)).resolves.toEqual({
      likesCount: 1,
      likedByMe: true,
    });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: postId, activa: true },
      { $addToSet: { likes: usuario._id } },
      { new: true },
    );
  });

  it('rejects removing a like the user did not add', async () => {
    model.findOneAndUpdate.mockResolvedValue(null);
    model.exists.mockResolvedValue({ _id: 'post-id' });

    await expect(service.quitarLike(postId, usuario)).rejects.toThrow(
      ConflictException,
    );
  });

  it('reports a missing post when adding a like', async () => {
    model.findOneAndUpdate.mockResolvedValue(null);

    await expect(service.darLike(postId, usuario)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('sorts by computed likes count before paginating', async () => {
    const filtros = Object.assign(new ListarPublicacionesDto(), {
      orden: 'likes' as const,
      offset: 4,
      limit: 2,
    });

    await service.listar(filtros);

    expect(model.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $addFields: {
            likesCount: { $size: { $ifNull: ['$likes', []] } },
          },
        }),
        { $sort: { likesCount: -1, createdAt: -1 } },
        { $skip: 4 },
        { $limit: 2 },
      ]),
    );
  });

  it('returns comments sorted newest-first and paginated without dropping the total', async () => {
    const comentarios = [
      {
        _id: 'comment-old',
        usuario: {
          _id: 'user-id',
          imagenPerfil: 'https://example.test/avatar.png',
        },
        username: 'old',
        texto: 'Older',
        createdAt: new Date('2026-01-01T10:00:00Z'),
        modificado: false,
      },
      {
        _id: 'comment-new',
        usuario: 'other-user',
        username: 'new',
        texto: 'Newer',
        createdAt: new Date('2026-01-02T10:00:00Z'),
        modificado: true,
      },
    ];
    const query = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ comentarios }),
    };
    model.findOne.mockReturnValue(query);

    await expect(
      service.listarComentarios(postId, { offset: 1, limit: 1 }),
    ).resolves.toEqual({
      items: [
        expect.objectContaining({
          _id: 'comment-old',
          texto: 'Older',
          usuario: 'user-id',
          imagenPerfil: 'https://example.test/avatar.png',
        }),
      ],
      total: 2,
      offset: 1,
      limit: 1,
    });
    expect(query.populate).toHaveBeenCalledWith(
      'comentarios.usuario',
      'imagenPerfil',
    );
  });

  it('creates a comment with its author and initial modification state', async () => {
    const comentario = {
      _id: '64b7f9e9aa4c7fce5d2f1235',
      usuario: 'user-id',
      username: 'user',
      texto: 'Hello',
      createdAt: new Date(),
      modificado: false,
    };
    model.findOneAndUpdate.mockResolvedValue({ comentarios: [comentario] });

    await expect(
      service.crearComentario(postId, { texto: ' Hello ' }, usuario),
    ).resolves.toEqual(
      expect.objectContaining({
        _id: comentario._id,
        usuario: 'user-id',
        username: 'user',
        texto: 'Hello',
        modificado: false,
      }),
    );
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: postId, activa: true },
      {
        $push: {
          comentarios: expect.objectContaining({
            usuario: usuario._id,
            username: 'user',
            texto: 'Hello',
            modificado: false,
          }),
        },
      },
      { new: true, projection: { comentarios: { $slice: -1 } } },
    );
  });

  it('marks a comment edited when its author updates it', async () => {
    const comentario = {
      _id: '64b7f9e9aa4c7fce5d2f1235',
      usuario: 'user-id',
      username: 'user',
      texto: 'Original',
      createdAt: new Date(),
      modificado: false,
    };
    const publicacion = {
      comentarios: [comentario],
      save: jest.fn().mockResolvedValue(undefined),
    };
    model.findOne.mockResolvedValue(publicacion);

    await expect(
      service.actualizarComentario(
        postId,
        comentario._id,
        { texto: '  Actualizado  ' },
        usuario,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        texto: 'Actualizado',
        modificado: true,
      }),
    );
    expect(publicacion.save).toHaveBeenCalled();
  });

  it('does not allow another user to edit a comment', async () => {
    const publicacion = {
      comentarios: [
        {
          _id: '64b7f9e9aa4c7fce5d2f1235',
          usuario: 'different-user',
          username: 'other',
          texto: 'Original',
          createdAt: new Date(),
          modificado: false,
        },
      ],
    };
    model.findOne.mockResolvedValue(publicacion);

    await expect(
      service.actualizarComentario(
        postId,
        '64b7f9e9aa4c7fce5d2f1235',
        { texto: 'Changed' },
        usuario,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
