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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { signUpSchema, type SignUpData } from '../models/signup.schema';

export default function SignUpForm() {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
  });

  function onSubmit(data: SignUpData) {
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
          <FieldGroup className="grid grid-cols-2">
            <Field>
              <FieldLabel htmlFor="signup-name">Имя</FieldLabel>
              <Input
                type="text"
                id="signup-name"
                placeholder="Ваше имя"
                {...register('name')}
              />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-surname">Фамилия</FieldLabel>
              <Input
                type="text"
                id="signup-surname"
                placeholder="Ваша фамилия"
                {...register('surname')}
              />
              <FieldError>{errors.surname?.message}</FieldError>
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="signup-email">Email</FieldLabel>
            <Input
              type="email"
              id="signup-email"
              placeholder="Ваш email"
              {...register('email')}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="signup-password">Пароль</FieldLabel>
            <PasswordInput
              id="signup-password"
              placeholder="Ваш пароль"
              {...register('password')}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="signup-password-confirm">
              Подтвердите пароль
            </FieldLabel>
            <PasswordInput
              id="signup-password-confirm"
              placeholder="Повторите ваш пароль"
              {...register('passwordConfirm')}
            />
            <FieldError>{errors.passwordConfirm?.message}</FieldError>
          </Field>
        </FieldGroup>
      </FieldSet>
      <Button type="submit">Зарегистрироваться</Button>
    </form>
  );
}
