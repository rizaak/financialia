import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuth0Configured } from '../lib/auth0Configured';
import { LoginPage } from './LoginPage';

function LoginRedirectAuth0() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    void loginWithRedirect({
      appState: { returnTo: `${window.location.origin}/dashboard` },
    });
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <LoginPage>
      <p className="font-medium text-zinc-300">
        {isLoading ? 'Cargando…' : 'Conectando con el proveedor de acceso…'}
      </p>
    </LoginPage>
  );
}

/**
 * Inicia sesión con Auth0 y regresa al dashboard.
 */
export function LoginRedirectPage() {
  if (!isAuth0Configured()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginRedirectAuth0 />;
}
