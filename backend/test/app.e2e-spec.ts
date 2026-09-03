import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request, { Response } from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

interface AuthBody {
  user: {
    id: string;
    email: string;
    name: string;
    surname: string;
    createdAt: string;
  };
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken?: string;
}

function authBody(response: Response): AuthBody {
  return response.body as AuthBody;
}

function refreshCookie(response: Response): string {
  const setCookie = response.headers['set-cookie'];
  if (!Array.isArray(setCookie) || !setCookie[0]) {
    throw new Error('Expected a refresh cookie');
  }
  return setCookie[0].split(';')[0];
}

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE "users" CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, reads /me, refreshes and logs out', async () => {
    const browser = request.agent(app.getHttpServer());
    const registerResponse = await browser
      .post('/api/v1/auth/register')
      .send({
        name: 'Ivan',
        surname: 'Ivanov',
        email: 'ivan@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
      })
      .expect(201);
    const registered = authBody(registerResponse);

    expect(registered.refreshToken).toBeUndefined();
    expect(registered.accessTokenExpiresIn).toBe(900);
    const rawCookieHeader = registerResponse.headers['set-cookie'] as unknown;
    const cookieHeader = Array.isArray(rawCookieHeader)
      ? String(rawCookieHeader[0])
      : String(rawCookieHeader);
    expect(refreshCookie(registerResponse)).toMatch(/^refresh_token=/);
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('Path=/api/v1/auth');
    expect(cookieHeader).toContain('SameSite=Lax');

    const stored = await dataSource.query<
      Array<{ password_hash: string; refresh_token_hash: string }>
    >(`
      SELECT u.password_hash, s.refresh_token_hash
      FROM users u
      JOIN auth_sessions s ON s.user_id = u.id
    `);
    expect(stored[0].password_hash.startsWith('$argon2id$')).toBe(true);
    expect(stored[0].password_hash).not.toContain('password123');
    expect(stored[0].refresh_token_hash).toMatch(/^[a-f0-9]{64}$/);

    await browser
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .expect(200)
      .expect(({ body }: Response) => {
        expect((body as AuthBody['user']).email).toBe('ivan@example.com');
      });

    const refreshResponse = await browser
      .post('/api/v1/auth/refresh')
      .expect(200);
    const refreshed = authBody(refreshResponse);
    expect(refreshed.accessToken).not.toBe(registered.accessToken);

    await browser.post('/api/v1/auth/logout').expect(204);
    await browser
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refreshed.accessToken}`)
      .expect(200);
    await browser.post('/api/v1/auth/refresh').expect(401);

    const firstLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ivan@example.com', password: 'password123' })
      .expect(200);
    const secondLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ivan@example.com', password: 'password123' })
      .expect(200);
    const secondLoginCookie = refreshCookie(secondLogin);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${authBody(firstLogin).accessToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authBody(secondLogin).accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', secondLoginCookie)
      .expect(401);
  });

  it('rejects a reused refresh token and revokes its session', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Replay',
        surname: 'Test',
        email: 'replay@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
      })
      .expect(201);
    const oldCookie = refreshCookie(registerResponse);

    const rotatedResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldCookie)
      .expect(200);
    const rotated = authBody(rotatedResponse);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldCookie)
      .expect(401)
      .expect(({ body }: Response) => {
        expect((body as { code: string }).code).toBe('INVALID_REFRESH_TOKEN');
      });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${rotated.accessToken}`)
      .expect(200);

    const sessionRows = await dataSource.query<Array<{ id: string }>>(
      'SELECT id FROM auth_sessions LIMIT 1',
    );
    const expiredAccessToken = new JwtService().sign(
      {
        sub: authBody(registerResponse).user.id,
        sid: sessionRows[0].id,
        type: 'access',
        jti: 'e2e-expired-token',
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        issuer: 'taskflow-api',
        audience: 'taskflow-web',
        expiresIn: -1,
      },
    );
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredAccessToken}`)
      .expect(401);
  });

  it('normalizes email and returns a stable duplicate error', async () => {
    const payload = {
      name: 'Ivan',
      surname: 'Ivanov',
      email: 'ivan@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
    };
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...payload, email: '  IVAN@EXAMPLE.COM ' })
      .expect(409)
      .expect(({ body }: Response) => {
        expect((body as { code: string }).code).toBe('EMAIL_ALREADY_EXISTS');
      });
  });

  it('returns field errors when password confirmation does not match', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Validation',
        surname: 'Test',
        email: 'validation@example.com',
        password: 'password123',
        passwordConfirm: 'different123',
      })
      .expect(400)
      .expect(({ body }: Response) => {
        const error = body as {
          code: string;
          fields: { passwordConfirm: string[] };
        };
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.fields.passwordConfirm).toBeDefined();
      });
  });
});
