import z from 'zod';

export const passwordSchema = z
  .string()
  .min(8, { error: 'Длина пароля должна быть минимум 8 символов' })
  .max(40, { error: 'Слишком длинный пароль' });

export const emailSchema = z.email({
  error: (issue) => {
    return issue.input === ''
      ? 'Поле не может быть пустым'
      : 'Некорректный email адрес';
  },
});
