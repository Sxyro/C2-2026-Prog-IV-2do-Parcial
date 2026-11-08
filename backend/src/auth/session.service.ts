import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

interface SessionPayload {
  sub: string;
  exp: number;
}

@Injectable()
export class SessionService {
  private readonly secret: string;

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('AUTH_TOKEN_SECRET');

    if (this.secret.length < 32) {
      throw new Error('AUTH_TOKEN_SECRET debe tener al menos 32 caracteres');
    }
  }

  createToken(userId: string): string {
    const payload: SessionPayload = {
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );

    return `${encodedPayload}.${this.sign(encodedPayload)}`;
  }

  verifyToken(token: string): SessionPayload {
    const [encodedPayload, signature, extra] = token.split('.');

    if (!encodedPayload || !signature || extra) {
      throw new UnauthorizedException('Token inválido');
    }

    const expectedSignature = this.sign(encodedPayload);
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw new UnauthorizedException('Token inválido');
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as SessionPayload;

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.exp !== 'number' ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        throw new UnauthorizedException('La sesión expiró');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Token inválido');
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret)
      .update(payload)
      .digest('base64url');
  }
}
