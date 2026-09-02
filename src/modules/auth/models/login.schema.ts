import z from 'zod';
import { emailSchema, passwordSchema } from './schemas';

export const logInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LogInData = z.infer<typeof logInSchema>;
