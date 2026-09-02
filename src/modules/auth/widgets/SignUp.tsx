import { PATHS } from '@/shared/constants/routes';
import { buttonVariants } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Link } from 'react-router';
import SignUpForm from '../components/SignUpForm';

export default function SignUp() {
  return (
    <Card className="w-sm">
      <CardHeader>
        <CardTitle>
          <h1>Создание аккаунта</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
      <CardFooter className="gap-1">
        <p>У вас уже есть аккаунт?</p>
        <Link to={PATHS.logIn} className={buttonVariants({ variant: 'link' })}>
          Войти
        </Link>
      </CardFooter>
    </Card>
  );
}
