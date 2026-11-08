import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const secret = 'a-secure-test-secret-with-at-least-32-characters';
  let service: SessionService;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(secret),
    } as unknown as ConfigService;
    service = new SessionService(configService);
  });

  it('creates a verifiable token for a user', () => {
    const token = service.createToken('user-id');

    expect(service.verifyToken(token).sub).toBe('user-id');
  });

  it('rejects a token whose signature was changed', () => {
    const token = service.createToken('user-id');
    const [payload, signature] = token.split('.');
    const changedToken = `${payload}.${signature === 'invalid' ? 'changed' : 'invalid'}`;

    expect(() => service.verifyToken(changedToken)).toThrow(
      UnauthorizedException,
    );
  });
});
