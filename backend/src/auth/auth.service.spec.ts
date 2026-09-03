import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthSession } from './entities/auth-session.entity';

const user: User = {
  id: '127608f4-cf34-4da4-975b-741f499eea34',
  name: 'Ivan',
  surname: 'Ivanov',
  email: 'ivan@example.com',
  passwordHash: '',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  sessions: [],
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: jest.Mock;
    findForAuthentication: jest.Mock;
    toPublicUser: jest.Mock;
  };
  let sessions: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
  };
  let managerSessions: typeof sessions;
  let managerUsers: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };

  beforeEach(() => {
    usersService = {
      create: jest.fn().mockResolvedValue({ ...user }),
      findForAuthentication: jest.fn(),
      toPublicUser: jest.fn((value: User) => ({
        id: value.id,
        name: value.name,
        surname: value.surname,
        email: value.email,
        createdAt: value.createdAt,
      })),
    };
    sessions = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    };
    managerSessions = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      update: jest.fn(),
      findOne: jest.fn(),
    };
    managerUsers = {
      create: jest.fn((value) => ({ ...user, ...value })),
      save: jest.fn(async (value) => value),
      findOneBy: jest.fn(),
    };

    const configValues: Record<string, unknown> = {
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_SECONDS: 2_592_000,
      JWT_ISSUER: 'taskflow-api',
      JWT_AUDIENCE: 'taskflow-web',
      JWT_ACCESS_SECRET: 'access-secret-that-is-at-least-32-characters',
      JWT_REFRESH_SECRET: 'refresh-secret-that-is-at-least-32-characters',
    };
    const config = {
      getOrThrow: jest.fn((key: string) => configValues[key]),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === AuthSession ? managerSessions : managerUsers,
      ),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };

    service = new AuthService(
      usersService as unknown as UsersService,
      sessions as unknown as Repository<AuthSession>,
      new JwtService(),
      config as unknown as ConfigService,
      dataSource as unknown as DataSource,
    );
  });

  it('registers a user with a password hash and creates a session', async () => {
    const result = await service.register(
      {
        name: 'Ivan',
        surname: 'Ivanov',
        email: 'ivan@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
      },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );

    const createInput = managerUsers.create.mock.calls[0][0] as {
      passwordHash: string;
    };
    expect(createInput.passwordHash).not.toBe('password123');
    expect(createInput.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(managerSessions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it('returns a stable conflict when the normalized email already exists', async () => {
    managerUsers.save.mockRejectedValue(
      new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate'), { code: '23505' }),
      ),
    );

    await expect(
      service.register(
        {
          name: 'Ivan',
          surname: 'Ivanov',
          email: 'ivan@example.com',
          password: 'password123',
          passwordConfirm: 'password123',
        },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EMAIL_ALREADY_EXISTS' }),
    });
  });

  it('does not reveal whether an email exists on failed login', async () => {
    usersService.findForAuthentication.mockResolvedValue(null);

    await expect(
      service.login(
        { email: 'missing@example.com', password: 'password123' },
        {},
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_CREDENTIALS' }),
    });
  });

  it('rotates a refresh token and revokes the session on replay', async () => {
    const initial = await service.register(
      {
        name: 'Ivan',
        surname: 'Ivanov',
        email: 'ivan@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
      },
      {},
    );
    const storedSession = managerSessions.save.mock.calls[0][0] as AuthSession;
    managerSessions.findOne.mockResolvedValue(storedSession);
    managerUsers.findOneBy.mockResolvedValue({ ...user });

    const rotated = await service.refresh(initial.refreshToken);
    expect(rotated.refreshToken).not.toBe(initial.refreshToken);

    await expect(service.refresh(initial.refreshToken)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_REFRESH_TOKEN' }),
    });
    expect(storedSession.revokedAt).toBeInstanceOf(Date);
  });
});
