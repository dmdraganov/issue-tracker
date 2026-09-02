import { Outlet } from 'react-router';

export default function AuthLayout() {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <Outlet />
    </div>
  );
}
