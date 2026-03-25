export function isAuth0Configured(): boolean {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim();
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID?.trim();
  return Boolean(domain && clientId);
}
