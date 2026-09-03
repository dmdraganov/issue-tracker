import { PATHS } from '@/shared/config/routes';
import { buttonVariants } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Link } from 'react-router';
import LogInForm from '../components/LogInForm';

export default function LogIn() {
  return (
    <Card className="w-sm">
      <CardHeader>
        <CardTitle>
          <h1>Вход в аккаунт</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LogInForm />
      </CardContent>
      <CardFooter>
        <p>У вас нет аккаунта?</p>
        <Link to={PATHS.signUp} className={buttonVariants({ variant: 'link' })}>
          Зарегистрироваться
        </Link>
      </CardFooter>
    </Card>
  );
}
