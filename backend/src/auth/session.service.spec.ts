import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const secret = 'a-secure-test-secret-with-at-least-32-characters';
  let service: SessionService;

  beforeEach(() => {
    const jwtService = new JwtService({
      secret,
      signOptions: {
        algorithm: 'HS256',
        expiresIn: SessionService.tokenTtlSeconds,
      },
      verifyOptions: {
        algorithms: ['HS256'],
      },
    });
    service = new SessionService(jwtService);
  });

  it('creates a verifiable token for a user', () => {
    const createdAt = Math.floor(Date.now() / 1000);
    const identity = {
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      perfil: 'usuario' as const,
    };
    const token = service.createToken(identity);

    expect(service.verifyToken(token)).toEqual(
      expect.objectContaining({ sub: 'user-id', rol: 'usuario' }),
    );
    expect(token.split('.')).toHaveLength(3);
    const ttl = service.verifyToken(token).exp - createdAt;
    expect(ttl).toBeGreaterThanOrEqual(180);
    expect(ttl).toBeLessThanOrEqual(181);
  });

  it('refreshes a token preserving its identity and setting a new expiry', () => {
    const token = service.createToken({
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      perfil: 'administrador',
    });

    const refreshed = service.verifyToken(service.refreshToken(token));
    expect(refreshed).toEqual(
      expect.objectContaining({
        sub: 'user-id',
        email: 'user@example.com',
        username: 'user',
        rol: 'administrador',
      }),
    );
    expect(refreshed.exp).toBeGreaterThan(
      Math.floor(Date.now() / 1000) + 170,
    );
  });

  it('rejects a token whose signature was changed', () => {
    const token = service.createToken({
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      perfil: 'usuario',
    });
    const [header, payload, signature] = token.split('.');
    const changedSignature =
      signature === 'invalid' ? 'changed' : 'invalid';
    const changedToken = `${header}.${payload}.${changedSignature}`;

    expect(() => service.verifyToken(changedToken)).toThrow(
      UnauthorizedException,
    );
  });
});
