import { Button } from '@/shared/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import PasswordInput from '../components/PasswordInput';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  logInFormSchema,
  type LogInFormData,
} from '../models/schemas/login.schema';

export default function LogInForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(logInFormSchema),
  });

  function onSubmit(data: LogInFormData) {
    console.log(data);
  }

  return (
    <form
      className="contents"
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      noValidate
    >
      <FieldSet className="flex gap-2">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input
              type="email"
              id="login-email"
              placeholder="Ваш email"
              {...register('email')}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="login-password">Пароль</FieldLabel>
            <PasswordInput
              id="login-password"
              placeholder="Ваш пароль"
              {...register('password')}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </Field>
        </FieldGroup>
      </FieldSet>
      <Button type="submit">Войти</Button>
    </form>
  );
}
