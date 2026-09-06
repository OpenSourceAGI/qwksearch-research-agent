/** `linkedom` is only used by the dev-server template rewriter; never reached on Workers. */
export const parseHTML = () => {
  throw new Error('[lobehub-workers] linkedom is not available on Cloudflare Workers');
};
export default { parseHTML };
