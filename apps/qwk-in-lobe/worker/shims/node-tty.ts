/** `node:tty` shim: Workers have no terminals, so nothing is a TTY. */
export const isatty = () => false;
export class ReadStream {}
export class WriteStream {}
export default { ReadStream, WriteStream, isatty };
