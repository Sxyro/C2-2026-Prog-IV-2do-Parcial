import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {}

  async crear(datos: Partial<Usuario>): Promise<UsuarioDocument> {
    const nuevoUsuario = new this.usuarioModel(datos);
    return nuevoUsuario.save();
  }

  async buscarPorEmail(email: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findOne({ email: email.toLowerCase().trim() });
  }

  async buscarPorUsername(username: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findOne({
      username: username.toLowerCase().trim(),
    });
  }

  async buscarPorIdentificador(
    identificador: string,
  ): Promise<UsuarioDocument | null> {
    const valor = identificador.toLowerCase().trim();

    return this.usuarioModel
      .findOne({
        $or: [{ email: valor }, { username: valor }],
      })
      .select('+password');
  }

  async buscarPorId(id: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findById(id);
  }
}
