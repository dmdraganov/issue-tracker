process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://taskflow:taskflow@localhost:5433/taskflow_test';
process.env.DB_SSL = 'false';
process.env.JWT_ACCESS_SECRET =
  'e2e-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET =
  'e2e-refresh-secret-that-is-at-least-32-characters';
process.env.JWT_ISSUER = 'taskflow-api';
process.env.JWT_AUDIENCE = 'taskflow-web';
process.env.FRONTEND_ORIGINS = 'http://localhost:5173';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.COOKIE_SECURE = 'false';
