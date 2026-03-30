import { useAuth0 } from '@auth0/auth0-react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuth0Configured } from '../lib/auth0Configured';

function ProtectedOutletAuth0() {
  const { isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Cargando sesión…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/** Rutas que requieren sesión Auth0. En modo dev sin Auth0, deja pasar. */
export function ProtectedOutlet() {
  if (!isAuth0Configured()) {
    return <Outlet />;
  }
  return <ProtectedOutletAuth0 />;
}
