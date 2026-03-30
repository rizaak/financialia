import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuth0Configured } from '../lib/auth0Configured';
import { AuthRegisterShell } from './AuthRegisterShell';

function RegisterRedirectAuth0() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    void loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
      },
      appState: { returnTo: `${window.location.origin}/dashboard` },
    });
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthRegisterShell>
      <p className="font-medium text-zinc-300">{isLoading ? 'Cargando…' : 'Abriendo registro seguro…'}</p>
    </AuthRegisterShell>
  );
}

/**
 * Registro vía Auth0 (screen_hint signup) y regreso al dashboard.
 */
export function RegisterRedirectPage() {
  if (!isAuth0Configured()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <RegisterRedirectAuth0 />;
}
