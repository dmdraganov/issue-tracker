import z from 'zod';

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  surname: z.string(),
  email: z.email(),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;
