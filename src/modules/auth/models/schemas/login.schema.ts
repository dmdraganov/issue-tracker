import z from 'zod';
import { emailSchema, passwordSchema } from './vo.schemas';

export const logInFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LogInFormData = z.infer<typeof logInFormSchema>;
