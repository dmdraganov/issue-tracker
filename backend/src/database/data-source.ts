import 'reflect-metadata';
import { config as loadEnvironment } from 'dotenv';
import { DataSource } from 'typeorm';
import { AuthSession } from '../auth/entities/auth-session.entity';
import { User } from '../users/user.entity';

loadEnvironment();

const useSsl = process.env.DB_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, AuthSession],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  synchronize: false,
  migrationsRun: false,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
