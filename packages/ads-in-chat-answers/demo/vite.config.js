import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = fileURLToPath(new URL('../src', import.meta.url));

/**
 * Serves `/api/<name>` in `vite dev` from `server/<name>.js`, the same
 * handlers the Vercel build bundles, so the dev server is the whole demo.
 * Loaded through `ssrLoadModule` so edits to them, and to the package's
 * `src/server`, apply without a restart.
 */
function apiRoutes() {
  return {
    name: 'demo-api-routes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = /^\/api\/([a-z-]+)\/?(?:\?.*)?$/.exec(req.url ?? '');
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/server/${match[1]}.js`);
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
          });
          const response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

// The demo builds the package from source rather than from `dist/`, so a
// Vercel build needs no separate package build step and an edit to `src/`
// shows up on the next `vite` reload.
//
// `dedupe` makes `../src` resolve React from this app's node_modules: the
// source files sit outside the Vite root, and without it they would look for
// React in the package's own node_modules and load a second copy.
export default defineConfig({
  plugins: [react(), apiRoutes()],
  resolve: {
    alias: [
      { find: 'ads-in-chat-answers/styles.css', replacement: `${src}/styles.css` },
      { find: /^ads-in-chat-answers$/, replacement: `${src}/index.ts` },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    fs: { allow: ['..'] },
  },
});
