import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { ActualizarPerfilDto } from '../usuarios/dto/actualizar-perfil.dto';
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
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

      return this.respuestaAutenticacion(usuario);
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

  async actualizarPerfil(
    usuario: UsuarioDocument,
    datos: ActualizarPerfilDto,
    imagenPerfil?: Express.Multer.File,
  ) {
    if (datos.email !== undefined) {
      const emailExistente = await this.usuariosService.buscarPorEmail(
        datos.email,
      );

      if (
        emailExistente &&
        String(emailExistente._id) !== String(usuario._id)
      ) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    if (datos.username !== undefined) {
      const usernameExistente = await this.usuariosService.buscarPorUsername(
        datos.username,
      );

      if (
        usernameExistente &&
        String(usernameExistente._id) !== String(usuario._id)
      ) {
        throw new ConflictException('El nombre de usuario ya está registrado');
      }
    }

    if (datos.nombre !== undefined) {
      usuario.nombre = datos.nombre;
    }

    if (datos.apellido !== undefined) {
      usuario.apellido = datos.apellido;
    }

    if (datos.email !== undefined) {
      usuario.email = datos.email;
    }

    if (datos.username !== undefined) {
      usuario.username = datos.username;
    }

    if (datos.fechaNacimiento !== undefined) {
      usuario.fechaNacimiento = new Date(datos.fechaNacimiento);
    }

    if (datos.descripcion !== undefined) {
      usuario.descripcion = datos.descripcion;
    }

    if (imagenPerfil) {
      usuario.imagenPerfil = await this.cloudinaryService.subirImagen(
        imagenPerfil.buffer,
      );
    }

    try {
      await usuario.save();
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

    const { password: _password, ...usuarioSeguro } = usuario.toObject();

    return usuarioSeguro;
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

    return this.respuestaAutenticacion(usuario);
  }

  async autorizar(token: string) {
    const { sub } = this.sessionService.verifyToken(token);
    const usuario = await this.usuariosService.buscarPorId(sub);

    if (!usuario) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    const { password: _password, ...usuarioSeguro } = usuario.toObject();

    return usuarioSeguro;
  }

  refrescar(token: string) {
    return {
      accessToken: this.sessionService.refreshToken(token),
    };
  }

  private respuestaAutenticacion(
    usuario: Awaited<ReturnType<UsuariosService['crear']>>,
  ) {
    const { password: _password, ...usuarioSeguro } = usuario.toObject();

    return {
      ...usuarioSeguro,
      accessToken: this.sessionService.createToken({
        id: String(usuario._id),
        email: usuario.email,
        username: usuario.username,
        perfil: usuario.perfil as 'usuario' | 'administrador',
      }),
    };
  }
}
