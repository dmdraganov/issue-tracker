import { PublicUser } from '../users/user.types';

interface JwtTokenPayloadBase {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AccessTokenPayload extends JwtTokenPayloadBase {
  type: 'access';
}

export interface RefreshTokenPayload extends JwtTokenPayloadBase {
  type: 'refresh';
  sid: string;
}

export type JwtTokenPayload = AccessTokenPayload | RefreshTokenPayload;

export interface AuthenticatedUser {
  id: string;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}
