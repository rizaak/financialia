import axios, { type AxiosInstance } from 'axios';
import { getApiBaseUrl } from '../api/apiBaseUrl';

/**
 * Cliente HTTP centralizado (Bearer desde Auth0 o token de desarrollo).
 */
export function createApiClient(getAccessToken: () => Promise<string>): AxiosInstance {
  const client = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
      Accept: 'application/json',
    },
    validateStatus: (status) => status >= 200 && status < 300,
  });

  client.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}
