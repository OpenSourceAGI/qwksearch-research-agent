import { defineConfig } from "vite";

export default defineConfig({
  // No @vitejs/plugin-react needed — esbuild's automatic JSX runtime handles
  // .jsx files on its own, keeping this demo's own dependency list small.
  esbuild: {
    jsx: "automatic",
  },
  server: {
    proxy: {
      // Forwards to server.js so the browser never needs to know about
      // port 8787 or deal with CORS.
      "/api": "http://localhost:8787",
    },
  },
});
