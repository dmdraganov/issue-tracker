import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';

export function createTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const useSsl = config.getOrThrow<boolean>('DB_SSL');
  const environment = config.getOrThrow<string>('NODE_ENV');

  return {
    type: 'postgres',
    url: config.getOrThrow<string>('DATABASE_URL'),
    autoLoadEntities: true,
    migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
    synchronize: false,
    migrationsRun: false,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    logging:
      environment === 'test'
        ? false
        : environment === 'development'
          ? ['error', 'warn']
          : ['error'],
  };
}
