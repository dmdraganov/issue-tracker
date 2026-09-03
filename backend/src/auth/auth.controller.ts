import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import type { PublicUser } from '../users/user.types';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, RequestMetadata } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto, PublicUserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly allowedOrigins: Set<string>;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.allowedOrigins = new Set(
      config
        .getOrThrow<string>('FRONTEND_ORIGINS')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    this.assertTrustedOrigin(request);
    const result = await this.authService.register(dto, this.metadata(request));
    return this.setRefreshCookie(response, result);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    this.assertTrustedOrigin(request);
    const result = await this.authService.login(dto, this.metadata(request));
    return this.setRefreshCookie(response, result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    this.assertTrustedOrigin(request);
    const token = this.readRefreshCookie(request);
    if (!token) {
      this.clearRefreshCookie(response);
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired',
      });
    }

    try {
      const result = await this.authService.refresh(token);
      return this.setRefreshCookie(response, result);
    } catch (error) {
      this.clearRefreshCookie(response);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiNoContentResponse()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    this.assertTrustedOrigin(request);
    await this.authService.logout(this.readRefreshCookie(request));
    this.clearRefreshCookie(response);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse()
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logoutAll(user.id);
    this.clearRefreshCookie(response);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: PublicUserDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<PublicUser> {
    return this.authService.getCurrentUser(user.id);
  }

  private setRefreshCookie(
    response: Response,
    result: Awaited<ReturnType<AuthService['login']>>,
  ): AuthResponseDto {
    response.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...this.cookieOptions(),
      maxAge:
        this.config.getOrThrow<number>('REFRESH_TOKEN_TTL_SECONDS') * 1_000,
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
    };
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow<boolean>('COOKIE_SECURE'),
      sameSite: this.config.getOrThrow<'lax' | 'strict' | 'none'>(
        'COOKIE_SAME_SITE',
      ),
      path: '/api/v1/auth',
    };
  }

  private metadata(request: Request): RequestMetadata {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }

  private readRefreshCookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[REFRESH_COOKIE];
    return typeof token === 'string' ? token : undefined;
  }

  private assertTrustedOrigin(request: Request): void {
    const origin = request.get('origin');
    if (origin && !this.allowedOrigins.has(origin)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'UNTRUSTED_ORIGIN',
        message: 'Request origin is not allowed',
      });
    }
  }
}
