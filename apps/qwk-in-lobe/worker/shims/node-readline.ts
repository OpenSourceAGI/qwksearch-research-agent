/** `node:readline` is not provided by workerd; only reached by CLI-oriented code paths. */
export const createInterface = () => {
  throw new Error('[lobehub-workers] node:readline is not available on Cloudflare Workers');
};
export const promises = { createInterface };
export default { createInterface, promises };
