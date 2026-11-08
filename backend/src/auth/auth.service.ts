import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { CloudinaryService } from './cloudinary.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly sessionService: SessionService,
  ) {}

  async registrar(datos: RegistroDto, imagenPerfil?: Express.Multer.File) {
    const emailExistente = await this.usuariosService.buscarPorEmail(
      datos.email,
    );

    if (emailExistente) {
      throw new ConflictException('El email ya está registrado');
    }

    const usernameExistente = await this.usuariosService.buscarPorUsername(
      datos.username,
    );

    if (usernameExistente) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }

    const passwordHash = await bcrypt.hash(datos.password, 10);

    let imagenPerfilUrl = '';

    if (imagenPerfil) {
      imagenPerfilUrl = await this.cloudinaryService.subirImagen(
        imagenPerfil.buffer,
      );
    }

    try {
      const usuario = await this.usuariosService.crear({
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        username: datos.username,
        password: passwordHash,
        fechaNacimiento: new Date(datos.fechaNacimiento),
        descripcion: datos.descripcion,
        imagenPerfil: imagenPerfilUrl,
        perfil: 'usuario',
      });

      const { password: _password, ...usuarioSeguro } = usuario.toObject();

      return usuarioSeguro;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException(
          'El email o nombre de usuario ya está registrado',
        );
      }

      throw error;
    }
  }

  async iniciarSesion(datos: LoginDto) {
    const usuario = await this.usuariosService.buscarPorIdentificador(
      datos.identificador,
    );

    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordCorrecta = await bcrypt.compare(
      datos.password,
      usuario.password,
    );

    if (!passwordCorrecta) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const { password: _password, ...usuarioSeguro } = usuario.toObject();

    return {
      ...usuarioSeguro,
      accessToken: this.sessionService.createToken(String(usuario._id)),
    };
  }
}
