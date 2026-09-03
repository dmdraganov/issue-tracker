import z from 'zod';

const envConfigSchema = z.object({
  VITE_API_URL: z.url(),
});

export const envConfig = envConfigSchema.parse(import.meta.env);
