// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://prototipoalinstante.mariovaldez.dev",
  // Pure static output: Cloudflare serves dist/ as Worker static assets, no
  // server code runs at all.
  output: "static",
  server: { port: 4324, host: true },
  build: {
    // The mariovaldez.dev zone rate-limits request bursts per IP, so every
    // request on first load counts: inline the CSS instead of fetching it.
    inlineStylesheets: "always",
  },
  prefetch: false,
  devToolbar: { enabled: false },
  vite: {
    build: {
      // Never inline scripts into the HTML: the CSP (public/_headers) only
      // allows same-origin script files.
      assetsInlineLimit: 0,
      // three.js lands in its own lazy chunk; keep the warning quiet for it.
      chunkSizeWarningLimit: 700,
    },
  },
});
