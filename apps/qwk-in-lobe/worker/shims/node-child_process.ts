/** `node:child_process` is not provided by workerd; process spawning is unsupported. */
const unavailable = () => {
  throw new Error('[lobehub-workers] node:child_process is not available on Cloudflare Workers');
};
export const exec = unavailable;
export const execFile = unavailable;
export const execSync = unavailable;
export const execFileSync = unavailable;
export const spawn = unavailable;
export const spawnSync = unavailable;
export const fork = unavailable;
export default { exec, execFile, execFileSync, execSync, fork, spawn, spawnSync };
