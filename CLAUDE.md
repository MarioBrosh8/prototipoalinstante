# PROIN: notas para agentes

- Astro 7 static output, served by a Worker with static assets only (no script). Custom domain `prototipoalinstante.mariovaldez.dev` via `routes` in `wrangler.jsonc`. No `account_id` in config (public repo; wrangler uses the OAuth session or `CLOUDFLARE_ACCOUNT_ID`).
- Client JS lives in `src/scripts/*.ts` and is imported only from `src/scripts/main.ts`. Do not add `<script>` blocks to components: Astro inlines small import-free scripts, and the CSP in `public/_headers` (`script-src 'self'`) blocks inline JS in production. `vite.build.assetsInlineLimit: 0` keeps chunks external.
- The CSP allows `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (connect) because the mariovaldez.dev zone auto-injects Cloudflare Web Analytics; nothing else external.
- three.js is only in `src/scripts/printer3d.ts`, loaded with a dynamic import from `hero.ts` after `load` + idle. Import named classes only. The loop pauses offscreen and in hidden tabs. Reduced motion shows the finished, lit lamp with no spin.
- Photos go through `src/components/Photo.astro` (one AVIF/WebP encode per photo, max 900 px) so the same photo in several sections is one request. The `mariovaldez.dev` zone rate-limits bursts per IP on every subdomain: keep first-load requests low.
- Copy is es-MX with zero em or en dashes. Prices, payments and delivery facts come verbatim from PROIN's Instagram "Cotizaciones" post; don't invent claims. CTA label for contact is always "Cotiza por DM" (`cta.contact` in `src/data/site.ts`). The one exception is the composer's send area: Instagram can't prefill a DM (`ig.me` only takes `?ref=`), so it shows two literal steps, "Copia tu mensaje" and "Abre el chat y pégalo", and the second one also copies if the first was skipped.
- Palette: one accent (PROIN violet `#8a3bc1`). Tokens use `light-dark()` in `src/styles/global.css`; the page follows the system theme, the 3D chamber stays dark in both.
- `[hidden]` is forced to `display: none !important` globally; component `display` rules would otherwise un-hide things.
- Do not write `\u` escapes through the editor tools (they land as literal characters).
- Dev server port 4324 (`npm run dev`), production-like preview on 8791 (`npm run preview`, wrangler dev). Stop `astro dev` before `astro build`, or Vite's deps cache can break.
- `?shot=<section id>` (dev only) renders that section at the top for headless screenshots.
