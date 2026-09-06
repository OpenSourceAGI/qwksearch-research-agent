/** `@electric-sql/pglite` is a dev/test dependency; never used on Workers. */
export class PGlite {
  constructor() {
    throw new Error('[lobehub-workers] PGlite is not available on Cloudflare Workers');
  }
}
export const vector = {};
export default PGlite;
