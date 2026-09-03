import z from 'zod';
import { emailSchema, passwordSchema } from './vo.schemas';

export const SignUpFormSchema = z
  .object({
    name: z.string().min(1, 'Поле не может быть пустым'),
    surname: z.string().min(1, 'Поле не может быть пустым'),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string().min(1, 'Поле не может быть пустым'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    error: 'Пароли не совпадают',
    path: ['passwordConfirm'],
  });

export type SignUpFormData = z.infer<typeof SignUpFormSchema>;
