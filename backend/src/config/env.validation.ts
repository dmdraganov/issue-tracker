import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ISSUER: Joi.string().default('taskflow-api'),
  JWT_AUDIENCE: Joi.string().default('taskflow-web'),
  ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(2_592_000),
  FRONTEND_ORIGINS: Joi.string().default('http://localhost:5173'),
  COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  COOKIE_SECURE: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.valid(true).required(),
      otherwise: Joi.boolean().default(false),
    }),
}).custom((environment, helpers) => {
  const values = environment as Record<string, unknown>;
  if (values.COOKIE_SAME_SITE === 'none' && values.COOKIE_SECURE !== true) {
    const validationError: unknown = helpers.error('any.custom', {
      message: 'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none',
    });
    return validationError;
  }

  return values;
});
