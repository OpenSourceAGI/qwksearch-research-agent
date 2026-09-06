/**
 * `undici` shim for Workers: the Fetch primitives map to the platform globals,
 * the Node-only dispatcher/agent API throws when used.
 */
const unavailable = (name: string) => {
  throw new Error(`[lobehub-workers] undici.${name} is not available on Cloudflare Workers`);
};

class UnsupportedDispatcher {
  constructor() {
    unavailable('Dispatcher');
  }
}

export const fetch = globalThis.fetch;
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
export const FormData = globalThis.FormData;
export const File = globalThis.File;
export const Agent = UnsupportedDispatcher;
export const ProxyAgent = UnsupportedDispatcher;
export const EnvHttpProxyAgent = UnsupportedDispatcher;
export const Dispatcher = UnsupportedDispatcher;
export const Pool = UnsupportedDispatcher;
export const Client = UnsupportedDispatcher;
export const MockAgent = UnsupportedDispatcher;
export const request = () => unavailable('request');
export const stream = () => unavailable('stream');
export const pipeline = () => unavailable('pipeline');
export const setGlobalDispatcher = () => undefined;
export const getGlobalDispatcher = () => undefined;
export const errors = {};

export default {
  Agent,
  Client,
  Dispatcher,
  EnvHttpProxyAgent,
  File,
  FormData,
  Headers,
  MockAgent,
  Pool,
  ProxyAgent,
  Request,
  Response,
  errors,
  fetch,
  getGlobalDispatcher,
  pipeline,
  request,
  setGlobalDispatcher,
  stream,
};
