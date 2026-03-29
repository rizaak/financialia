/**
 * Claims habituales en access tokens de Auth0 (según scopes y configuración del tenant).
 * @see https://auth0.com/docs/secure/tokens/json-web-tokens/create-custom-claims
 */
export type Auth0JwtPayload = {
  sub: string;
  email?: string;
  name?: string;
  nickname?: string;
  picture?: string;
};
