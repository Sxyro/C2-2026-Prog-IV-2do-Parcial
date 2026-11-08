import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { CloudinaryService } from '../auth/cloudinary.service';
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { PublicacionesService } from './publicaciones.service';
import { PublicacionDocument } from './schemas/publicacion.schema';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto';

describe('PublicacionesService', () => {
  const postId = '64b7f9e9aa4c7fce5d2f1234';
  const usuario = { _id: 'user-id', perfil: 'usuario' } as unknown as UsuarioDocument;
  let model: {
    findOneAndUpdate: jest.Mock;
    exists: jest.Mock;
    aggregate: jest.Mock;
    populate: jest.Mock;
    countDocuments: jest.Mock;
  };
  let service: PublicacionesService;

  beforeEach(() => {
    model = {
      findOneAndUpdate: jest.fn(),
      exists: jest.fn(),
      aggregate: jest.fn().mockResolvedValue([]),
      populate: jest.fn().mockResolvedValue([]),
      countDocuments: jest.fn().mockResolvedValue(0),
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
});
