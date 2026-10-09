import { authEnv } from '@/envs/auth';
import { defineConfig } from '@/libs/better-auth/define-config';

let authInstance: ReturnType<typeof defineConfig> | undefined;

export const getAuth = () => {
  if (!authInstance) {
    authInstance = defineConfig({
      ...(authEnv.AUTH_COOKIE_PREFIX && { cookiePrefix: authEnv.AUTH_COOKIE_PREFIX }),
      plugins: [],
    });
  }
  return authInstance();
};

export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    return getAuth()[prop];
  },
});
