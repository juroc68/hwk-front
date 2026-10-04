import { defineConfig } from "vite";

// `npm run build` : site statique dans dist/ (chemins relatifs, hébergeable n'importe où)
export default defineConfig({
  base: "./",
  // sondage : sur ce lecteur, les modifications de fichiers ne sont pas toujours signalées à Vite
  server: { port: 8766, watch: { usePolling: true, interval: 300 } },
  build: { chunkSizeWarningLimit: 2000 }, // MapLibre et three.js pèsent ~1,7 Mo, c'est attendu
});
