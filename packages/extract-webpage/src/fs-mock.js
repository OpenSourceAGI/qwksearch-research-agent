/**
 * @fileoverview No-op `fs` module mock used to stub out Node's filesystem API
 * in bundled/browser builds where real filesystem access is unavailable.
 */
export const promises = {
  mkdir: async () => {},
  readFile: async () => "",
  writeFile: async () => {},
  appendFile: async () => {},
  stat: async () => ({ isDirectory: () => false }),
};

export const mkdir = promises.mkdir;
export const readFile = promises.readFile;
export const writeFile = promises.writeFile;
export const appendFile = promises.appendFile;
export const stat = promises.stat;

export default {
  promises,
  mkdir,
  readFile,
  writeFile,
  appendFile,
  stat,
};
