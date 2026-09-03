import AuthLayout from '@/app/layouts/AuthLayout';
import { SEGMENTS } from '@/shared/config/routes';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import AppLayout from '../layouts/AppLayout';
import SignUp from '@/modules/auth/widgets/SignUp';
import LogIn from '@/modules/auth/widgets/LogIn';

const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      {
        index: true,
        element: <div>Home</div>,
      },
      {
        Component: AuthLayout,
        children: [
          {
            path: SEGMENTS.logIn,
            Component: LogIn,
          },
          {
            path: SEGMENTS.signUp,
            Component: SignUp,
          },
        ],
      },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
