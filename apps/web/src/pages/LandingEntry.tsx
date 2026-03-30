import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import { isAuth0Configured } from '../lib/auth0Configured';
import { LandingPage } from './LandingPage';

function LandingEntryAuth0() {
  const { isAuthenticated, isLoading } = useAuth0();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-zinc-500">
        Cargando…
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LandingPage />;
}

/** Landing pública; si ya hay sesión Auth0, va al dashboard. */
export function LandingEntry() {
  if (!isAuth0Configured()) {
    return <LandingPage />;
  }
  return <LandingEntryAuth0 />;
}
