import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppToaster } from './components/AppToaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainLayout } from './layouts/MainLayout';
import { AppProviders } from './theme/AppProviders';
import type { ShellUser } from './layouts/shellContext';
import { AccountDetailPage } from './pages/AccountDetailPage';
import { AccountsPage } from './pages/AccountsPage';
import { DashboardPage } from './pages/DashboardPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { isAuth0Configured } from './lib/auth0Configured';

/** Alineación con React Router v7; reduce avisos de future flags en consola. */
const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

function Auth0Dashboard() {
  const { isLoading, isAuthenticated, loginWithRedirect, logout, user, getAccessTokenSilently } =
    useAuth0();
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE?.trim() ?? '';

  const getAccessToken = useCallback(async () => {
    if (!audience) {
      throw new Error('Falta la configuración de acceso. Contacta al administrador.');
    }
    try {
      return await getAccessTokenSilently({
        authorizationParams: {
          audience,
          scope: 'openid profile email offline_access',
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al obtener token';
      throw new Error(`${msg} Cierra sesión e inténtalo de nuevo.`);
    }
  }, [audience, getAccessTokenSilently]);

  const shellUser: ShellUser | undefined = useMemo(
    () =>
      user
        ? {
            email: user.email,
            name: user.name ?? user.nickname,
            picture: user.picture,
          }
        : undefined,
    [user],
  );

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    void loginWithRedirect();
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        {isLoading ? 'Cargando sesión…' : 'Redirigiendo al inicio de sesión…'}
      </div>
    );
  }

  return (
    <BrowserRouter future={routerFutureFlags}>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout
              getAccessToken={getAccessToken}
              user={shellUser}
              onLogout={() =>
                void logout({ logoutParams: { returnTo: window.location.origin } })
              }
            />
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route path="cuentas/:accountId" element={<AccountDetailPage />} />
          <Route path="cuentas" element={<AccountsPage />} />
          <Route path="inversiones" element={<InvestmentsPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="ajustes" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function DevTokenDashboard() {
  const hasToken = Boolean(import.meta.env.VITE_DEV_ACCESS_TOKEN?.trim());

  const getAccessToken = useCallback(async () => {
    return import.meta.env.VITE_DEV_ACCESS_TOKEN?.trim() ?? '';
  }, []);

  const configHint = !hasToken ? (
    <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
      Falta la configuración de acceso para este entorno. Revisa la documentación del proyecto o contacta al
      administrador.
    </div>
  ) : undefined;

  return (
    <BrowserRouter future={routerFutureFlags}>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout
              getAccessToken={getAccessToken}
              configHint={configHint}
              user={{ name: 'Modo pruebas', email: 'entorno local' }}
              onLogout={() => {
                window.location.reload();
              }}
            />
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="registro" element={<RegisterPage />} />
          <Route path="cuentas/:accountId" element={<AccountDetailPage />} />
          <Route path="cuentas" element={<AccountsPage />} />
          <Route path="inversiones" element={<InvestmentsPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="ajustes" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppToaster />
        {isAuth0Configured() ? <Auth0Dashboard /> : <DevTokenDashboard />}
      </AppProviders>
    </ErrorBoundary>
  );
}
