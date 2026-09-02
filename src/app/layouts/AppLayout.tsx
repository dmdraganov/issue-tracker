import { Outlet } from 'react-router';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <main className="flex-1 justify-items-stretch">
        <Outlet />
      </main>
    </div>
  );
}
