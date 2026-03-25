import { Auth0Provider } from '@auth0/auth0-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { isAuth0Configured } from './lib/auth0Configured';

const rootEl = document.getElementById('root')!;

function AppRoot() {
  if (!isAuth0Configured()) {
    return <App />;
  }

  const domain = import.meta.env.VITE_AUTH0_DOMAIN!.trim();
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID!.trim();
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE?.trim();

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(audience ? { audience } : {}),
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <App />
    </Auth0Provider>
  );
}

createRoot(rootEl).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
);
