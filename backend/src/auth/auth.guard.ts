import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema';
import { UsuariosService } from '../usuarios/usuarios.service';
import { SessionService } from './session.service';

type AuthenticatedRequest = Request & { user?: UsuarioDocument };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    protected readonly sessionService: SessionService,
    protected readonly usuariosService: UsuariosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.match(/^Bearer (.+)$/i)?.[1];

    if (!token) {
      throw new UnauthorizedException('Debés iniciar sesión');
    }

    const { sub } = this.sessionService.verifyToken(token);
    const usuario = await this.usuariosService.buscarPorId(sub);

    if (!usuario) {
      throw new UnauthorizedException('La sesión ya no es válida');
    }

    request.user = usuario;
    return true;
  }
}

@Injectable()
export class OptionalAuthGuard extends AuthGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization) {
      return true;
    }

    return super.canActivate(context);
  }
}
