import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppToaster } from './components/AppToaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainLayout } from './layouts/MainLayout';
import { AppProviders } from './theme/AppProviders';
import type { ShellUser } from './layouts/shellContext';
import { AccountDetailPage } from './pages/AccountDetailPage';
import { AccountsPage } from './pages/AccountsPage';
import { CommitmentsPage } from './pages/CommitmentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { LandingEntry } from './pages/LandingEntry';
import { LoginRedirectPage } from './pages/LoginRedirectPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { RegisterRedirectPage } from './pages/RegisterRedirectPage';
import { SettingsPage } from './pages/SettingsPage';
import { isAuth0Configured } from './lib/auth0Configured';
import { ProtectedOutlet } from './routes/ProtectedOutlet';

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

function Auth0MainShell() {
  const { getAccessTokenSilently, logout, user } = useAuth0();
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

  return (
    <MainLayout
      getAccessToken={getAccessToken}
      user={shellUser}
      onLogout={() => void logout({ logoutParams: { returnTo: window.location.origin } })}
    />
  );
}

function DevMainShell() {
  const hasToken = Boolean(import.meta.env.VITE_DEV_ACCESS_TOKEN?.trim());
  const getAccessToken = useCallback(async () => {
    return import.meta.env.VITE_DEV_ACCESS_TOKEN?.trim() ?? '';
  }, []);

  const configHint = !hasToken ? (
    <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300 backdrop-blur-[10px]">
      Falta la configuración de acceso para este entorno. Revisa la documentación del proyecto o contacta al
      administrador.
    </div>
  ) : undefined;

  return (
    <MainLayout
      getAccessToken={getAccessToken}
      configHint={configHint}
      user={{ name: 'Modo pruebas', email: 'entorno local' }}
      onLogout={() => {
        window.location.reload();
      }}
    />
  );
}

function AppRoutes() {
  const Shell = isAuth0Configured() ? Auth0MainShell : DevMainShell;
  return (
    <BrowserRouter future={routerFutureFlags}>
      <Routes>
        <Route path="/" element={<LandingEntry />} />
        <Route path="/login" element={<LoginRedirectPage />} />
        <Route path="/register" element={<RegisterRedirectPage />} />
        <Route element={<ProtectedOutlet />}>
          <Route element={<Shell />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="registro" element={<RegisterPage />} />
            <Route path="cuentas/:accountId" element={<AccountDetailPage />} />
            <Route path="cuentas" element={<AccountsPage />} />
            <Route path="compromisos" element={<CommitmentsPage />} />
            <Route path="inversiones" element={<InvestmentsPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="ajustes" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppToaster />
        <AppRoutes />
      </AppProviders>
    </ErrorBoundary>
  );
}
