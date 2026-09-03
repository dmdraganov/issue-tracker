import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { PublicUser } from '../users/user.types';
import { UsersService } from '../users/users.service';
import { authError } from './auth.errors';
import {
  AuthResult,
  JwtTokenPayload,
  RefreshTokenPayload,
  RequestMetadata,
} from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthSession } from './entities/auth-session.entity';

const INVALID_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$BNsCxLmGNDvYTadpg668ww$bM8+4fTQ7iwA8799yvCnJBAbldndV85x40vTFJfXaw8';

@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(AuthSession)
    private readonly sessionsRepository: Repository<AuthSession>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.accessTtl = config.getOrThrow<number>('ACCESS_TOKEN_TTL_SECONDS');
    this.refreshTtl = config.getOrThrow<number>('REFRESH_TOKEN_TTL_SECONDS');
    this.issuer = config.getOrThrow<string>('JWT_ISSUER');
    this.audience = config.getOrThrow<string>('JWT_AUDIENCE');
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  async register(
    dto: RegisterDto,
    metadata: RequestMetadata,
  ): Promise<AuthResult> {
    if (dto.password !== dto.passwordConfirm) {
      throw authError(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Request validation failed',
        { fields: { passwordConfirm: ['Passwords do not match'] } },
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    try {
      return await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const user = await users.save(
          users.create({
            name: dto.name,
            surname: dto.surname,
            email: dto.email,
            passwordHash,
          }),
        );
        return this.createSession(
          user,
          metadata,
          manager.getRepository(AuthSession),
        );
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw authError(
          HttpStatus.CONFLICT,
          'EMAIL_ALREADY_EXISTS',
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto, metadata: RequestMetadata): Promise<AuthResult> {
    const user = await this.usersService.findForAuthentication(dto.email);
    const passwordMatches = await argon2.verify(
      user?.passwordHash ?? INVALID_PASSWORD_HASH,
      dto.password,
    );

    if (!user || !passwordMatches) {
      throw authError(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    return this.createSession(user, metadata);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const result = await this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(AuthSession);
      const session = await sessions.findOne({
        where: { id: payload.sid },
        lock: { mode: 'pessimistic_write' },
      });

      if (!session || session.userId !== payload.sub || session.revokedAt) {
        return null;
      }

      const tokenMatches = this.refreshHashMatches(
        refreshToken,
        session.refreshTokenHash,
      );
      if (!tokenMatches || session.expiresAt <= new Date()) {
        session.revokedAt = new Date();
        await sessions.save(session);
        return null;
      }

      const user = await manager.getRepository(User).findOneBy({
        id: payload.sub,
      });
      if (!user) {
        session.revokedAt = new Date();
        await sessions.save(session);
        return null;
      }

      const tokens = await this.issueTokens(user, session.id);
      session.refreshTokenHash = this.hashRefreshToken(tokens.refreshToken);
      session.expiresAt = this.refreshExpiry();
      await sessions.save(session);

      return {
        user: this.usersService.toPublicUser(user),
        ...tokens,
      };
    });

    if (!result) {
      throw this.invalidRefreshToken();
    }

    return result;
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken, true);
      await this.sessionsRepository.update(
        { id: payload.sid, userId: payload.sub, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    } catch {
      // Logout is deliberately idempotent and does not reveal token state.
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionsRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw authError(
        HttpStatus.UNAUTHORIZED,
        'INVALID_ACCESS_TOKEN',
        'Access token refers to a user that no longer exists',
      );
    }

    return this.usersService.toPublicUser(user);
  }

  private async createSession(
    user: User,
    metadata: RequestMetadata,
    sessions: Repository<AuthSession> = this.sessionsRepository,
  ): Promise<AuthResult> {
    const sessionId = randomUUID();
    const tokens = await this.issueTokens(user, sessionId);
    const session = sessions.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent?.slice(0, 512) ?? null,
      expiresAt: this.refreshExpiry(),
      revokedAt: null,
    });
    await sessions.save(session);

    return {
      user: this.usersService.toPublicUser(user),
      ...tokens,
    };
  }

  private async issueTokens(user: User, sessionId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, type: 'access', jti: randomUUID() },
        {
          secret: this.accessSecret,
          expiresIn: this.accessTtl,
          issuer: this.issuer,
          audience: this.audience,
          algorithm: 'HS256',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
          sid: sessionId,
          type: 'refresh',
          jti: randomUUID(),
        },
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshTtl,
          issuer: this.issuer,
          audience: this.audience,
          algorithm: 'HS256',
        },
      ),
    ]);

    return {
      accessToken,
      accessTokenExpiresIn: this.accessTtl,
      refreshToken,
    };
  }

  private async verifyRefreshToken(
    token: string,
    ignoreExpiration = false,
  ): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtTokenPayload>(
        token,
        {
          secret: this.refreshSecret,
          issuer: this.issuer,
          audience: this.audience,
          algorithms: ['HS256'],
          ignoreExpiration,
        },
      );

      if (payload.type !== 'refresh' || !payload.sub || !payload.sid) {
        throw new Error('Unexpected token payload');
      }
      return payload;
    } catch {
      throw this.invalidRefreshToken();
    }
  }

  private invalidRefreshToken() {
    return authError(
      HttpStatus.UNAUTHORIZED,
      'INVALID_REFRESH_TOKEN',
      'Refresh token is invalid or expired',
    );
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshHashMatches(token: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashRefreshToken(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtl * 1_000);
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string };
    return driverError.code === '23505';
  }
}
