import z from 'zod';
import { userSchema } from '../models/schemas/user.schema';

export const authenticationSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
});
