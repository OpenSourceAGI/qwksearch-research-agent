import type { CreateClientConfig } from './src/client.gen';

export const baseUrl =
  typeof window !== 'undefined'
    ? '/api'
    : 'https://qwksearch.com/api';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl,
});