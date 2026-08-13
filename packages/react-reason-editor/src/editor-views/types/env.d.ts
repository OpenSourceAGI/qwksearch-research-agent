/**
 * Ambient declarations for the environment variables used by the example editor. Types the `process.env` fields consumed at build and runtime.
 */

declare namespace NodeJS {
  export interface ProcessEnv {
    MAIN_SERVICE_BASE_URL: string;
    API_APP: string;
  }
}
