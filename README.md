# PROIN · Prototipo al Instante

Sitio de **PROIN** ([@prototipoalinstante](https://www.instagram.com/prototipoalinstante/)), diseño e impresión 3D por metro Neza con envíos a CDMX y área metropolitana.

**https://prototipoalinstante.mariovaldez.dev**

- **Portada con impresión 3D en vivo** (three.js): la lámpara esférica de celosía de PROIN se imprime capa por capa con una boquilla que tiene la forma de su logo. Se puede girar, cambiar el filamento a media impresión (las capas nuevas salen del color nuevo), encender la lámpara y volver a imprimir.
- **Qué hacemos**: lámparas, trofeos, llaveros para negocio, maquetas, piezas a medida y diseño 3D, con fotos de sus trabajos.
- **Así se imprime tu idea**: los cuatro pasos, con un filamento que se "imprime" al hacer scroll.
- **Trabajos**: carrusel arrastrable que abre cada publicación en Instagram.
- **Precios, pagos y entregas**: lo que dice su publicación de *Cotizaciones*.
- **Tu cotización empieza con un mensaje**: arma el mensaje con lo que PROIN necesita para cotizar, lo copia y abre su DM (Instagram no permite prellenar mensajes).

## Stack

Astro 7 en modo estático, CSS propio y TypeScript sin framework. three.js se carga aparte y solo cuando la página ya está lista. Cloudflare Workers sirve `dist/` como assets estáticos, sin código de servidor, en el dominio propio `prototipoalinstante.mariovaldez.dev`.

Peso de la primera carga: unos 20 KB de HTML con el CSS incluido, 52 KB de fuente y 6 KB de JS, todo comprimido. Después llegan three.js (112 KB en brotli) y las fotos en AVIF conforme aparecen.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:4324
npm run check      # astro check (tipos)
npm run build      # genera dist/
npm run preview    # build + wrangler dev en http://localhost:8791, con los headers de producción
```

Todo lo editable (textos, precios, enlaces, qué foto va en cada lugar) está en `src/data/site.ts`. Las fotos viven en `src/assets/trabajos/` y salen de las publicaciones de Instagram de PROIN. Los colores de filamento del visor 3D están en `src/scripts/filaments.ts`.

En desarrollo, `?shot=<id de sección>` muestra esa sección arriba con todo revelado, para capturas de pantalla.

## Despliegue

```bash
npm run deploy     # check, build y wrangler deploy
```

Usa la sesión local de `wrangler` (`npx wrangler login`). La primera vez, `wrangler.jsonc` crea el registro DNS y el certificado del subdominio.

### Despliegue automático (GitHub Actions)

`.github/workflows/deploy.yml` revisa y compila cada push y cada PR. En `main` también despliega, pero solo si el repositorio tiene:

1. **Secret** `CLOUDFLARE_API_TOKEN`: token creado en dash.cloudflare.com > My Profile > API Tokens con la plantilla **Edit Cloudflare Workers**, limitado a tu cuenta y a la zona `mariovaldez.dev`.
2. **Variable** `CLOUDFLARE_ACCOUNT_ID`: el ID de la cuenta (lo muestra `npx wrangler whoami`).

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh variable set CLOUDFLARE_ACCOUNT_ID
```

Sin el token, el workflow solo compila y deja un aviso.

## Notas

- **Logo**: redibujado en SVG a partir de su foto de perfil y sus reels, porque no había un archivo vectorial. Si PROIN tiene el original, conviene reemplazar `src/components/Logo.astro`.
- **Fuente**: Bricolage Grotesque (SIL OFL 1.1, ver `public/fonts/OFL.txt`), recortada a los caracteres del español con los ejes de peso y tamaño óptico:
  `pyftsubset` sobre el archivo `latin-standard` de `@fontsource-variable/bricolage-grotesque`, luego `fonttools varLib.instancer ... wdth=100`.
- **Límite de peticiones**: la zona `mariovaldez.dev` tiene una regla de rate limit en todos sus subdominios. Por eso el CSS va dentro del HTML, hay un solo archivo de JS y cada foto tiene una sola versión que se reutiliza entre secciones.
- **Seguridad**: `public/_headers` define la CSP (solo scripts propios, nada inline) y la caché inmutable de `/_astro/*`. No hay llaves ni secretos en el repositorio.

Sitio por [Mario Valdez](https://mariovaldez.dev).
