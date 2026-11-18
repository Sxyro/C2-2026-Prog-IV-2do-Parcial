import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface SessionPayload {
  sub: string;
  email: string;
  username: string;
  rol: 'usuario' | 'administrador';
  exp: number;
  iat?: number;
}

export interface SessionIdentity {
  id: string;
  email: string;
  username: string;
  perfil: 'usuario' | 'administrador';
}

@Injectable()
export class SessionService {
  static readonly tokenTtlSeconds = 3 * 60;

  constructor(private readonly jwtService: JwtService) {}

  createToken(identity: SessionIdentity): string {
    return this.jwtService.sign({
      sub: identity.id,
      email: identity.email,
      username: identity.username,
      rol: identity.perfil,
    });
  }

  refreshToken(token: string): string {
    const { exp: _exp, iat: _iat, ...identity } = this.verifyToken(token);
    return this.jwtService.sign(identity);
  }

  verifyToken(token: string): SessionPayload {
    try {
      const payload = this.jwtService.verify<SessionPayload>(token);

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string' ||
        typeof payload.username !== 'string' ||
        !['usuario', 'administrador'].includes(payload.rol) ||
        typeof payload.exp !== 'number'
      ) {
        throw new UnauthorizedException('Token inválido');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (
        error instanceof Error &&
        ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(
          error.name,
        )
      ) {
        throw new UnauthorizedException(
          error.name === 'TokenExpiredError'
            ? 'La sesión expiró'
            : 'Token inválido',
        );
      }

      throw error;
    }
  }
}
