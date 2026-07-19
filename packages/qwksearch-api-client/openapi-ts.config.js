import { defineConfig } from '@hey-api/openapi-ts';

export const baseUrl = process.env.API_URL || 'https://app.qwksearch.com/api';

export const config = {
  input: './qwksearch-openapi.json',
  output: './src',
  plugins: [
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: '../baseurl.ts',
    },
  ],
};

export default defineConfig(config);