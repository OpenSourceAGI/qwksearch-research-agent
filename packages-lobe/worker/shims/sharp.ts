/** `sharp` shim: native image processing is unavailable on Workers (use Cloudflare Images instead). */
const sharp = () => {
  throw new Error('[lobehub-workers] sharp is not available on Cloudflare Workers');
};
export default sharp;
