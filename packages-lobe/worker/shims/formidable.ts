/** `formidable` shim: multipart parsing on Workers goes through `Request.formData()`. */
const formidable = () => {
  throw new Error('[lobehub-workers] formidable is not available on Cloudflare Workers');
};
export const IncomingForm = formidable;
export const errors = {};
export default formidable;
