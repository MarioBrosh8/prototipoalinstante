# Pro-In · Prototipo al Instante

Sitio de **Pro-In** ([@prototipoalinstante](https://www.instagram.com/prototipoalinstante/)), diseño e impresión 3D por metro Neza con envío a todo México. Contacto: WhatsApp +52 56 6794 1734 y contacto@prototipoalinstante.com.

**https://prototipoalinstante.com**

- **Portada con impresión 3D en vivo** (three.js): la lámpara esférica de celosía de Pro-In se imprime capa por capa con una boquilla que tiene la forma de su logo. Se puede girar, cambiar el filamento a media impresión (las capas nuevas salen del color nuevo), encender la lámpara y volver a imprimir.
- **Qué hacemos**: lámparas, trofeos, llaveros para negocio, maquetas, piezas a medida y diseño 3D, con fotos de sus trabajos.
- **Así se imprime tu idea**: los cuatro pasos, con un filamento que se "imprime" al hacer scroll.
- **Trabajos**: carrusel arrastrable que abre cada publicación en Instagram.
- **Precios, pagos y entregas**: lo que dice su publicación de *Cotizaciones*.
- **Tu cotización empieza con un mensaje**: el cuestionario de cotización (todos los botones "Cotiza tu idea" llevan aquí, con un salto corto y un aviso en la primera pregunta). Arma el mensaje con lo que Pro-In necesita, incluida la dirección, y se manda por el canal que elija el cliente: **WhatsApp** (por defecto; el enlace `wa.me` abre el chat con el mensaje ya escrito), **Instagram** (se copia y se pega en el DM, porque Instagram no permite prellenar mensajes) o **correo** (se abre ya escrito).
- **Logo animado**: la boquilla baja y el filamento dibuja el ojo de un solo trazo, como lo extruiría la impresora; las letras se imprimen por capas. Va en la barra de navegación y en grande en el pie de página, sobre el patrón del logo.

## Stack

Astro 7 en modo estático, CSS propio y TypeScript sin framework. three.js se carga aparte y solo cuando la página ya está lista. Cloudflare Workers sirve `dist/` como assets estáticos, sin código de servidor, en el dominio propio `prototipoalinstante.com`. `www.prototipoalinstante.com` es un Worker aparte de una línea que redirige al dominio principal (`workers/www-redirect/`), y la primera dirección, `prototipoalinstante.mariovaldez.dev`, sigue sirviendo el sitio con la URL canónica apuntando al `.com`.

Peso de la primera carga: unos 20 KB de HTML con el CSS incluido, 52 KB de fuente y 6 KB de JS, todo comprimido. Después llegan three.js (112 KB en brotli) y las fotos en AVIF conforme aparecen.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:4324
npm run check      # astro check (tipos)
npm run build      # genera dist/
npm run preview    # build + wrangler dev en http://localhost:8791, con los headers de producción
```

Todo lo editable (textos, precios, enlaces, qué foto va en cada lugar) está en `src/data/site.ts`. Las fotos viven en `src/assets/trabajos/` y salen de las publicaciones de Instagram de Pro-In. Los colores de filamento del visor 3D están en `src/scripts/filaments.ts`.

En desarrollo, `?shot=<id de sección>` muestra esa sección arriba con todo revelado, para capturas de pantalla.

## Despliegue

```bash
npm run deploy       # check, build y wrangler deploy
npm run deploy:www   # solo si cambia la redirección de www
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

## Correo: contacto@prototipoalinstante.com

Funciona con Gmail sin servidor de correo propio:

- **Recibir**: Cloudflare Email Routing reenvía `contacto@prototipoalinstante.com` a `prototipoalinstante@gmail.com` (regla en la zona; el destino se verifica una vez desde ese Gmail).
- **Responder**: Gmail envía como `contacto@` por el SMTP de Cloudflare Email Sending (`smtp.mx.cloudflare.net`, puerto 465 con SSL, usuario `api_token`, contraseña: un token de API con permiso **Email Sending: Edit**). Sale firmado con DKIM y SPF del dominio, así que pasa el DMARC `p=reject` del dominio. Requiere el plan Workers Paid (incluye 3,000 correos al mes).
- **DNS** (lo crea Cloudflare al activar Routing y Sending): MX y SPF en el dominio, DKIM `cf2024-1` y `cf-bounce`, subdominio de rebote `cf-bounce` y DMARC.

Nunca pongas el token en el repositorio: solo va en la configuración de Gmail.

## Notas

- **Logo**: vectorizado de los dos archivos que mandó Pro-In (el símbolo y el logo completo). La boquilla son rectángulos redondeados ajustados a la imagen; el ojo y las letras están trazados con potrace. Los trazos viven en `src/data/logo.ts` y `src/components/Logo.astro` los dibuja (`variant="mark"` o `"full"`, con `animate` para la animación).
- **Fuente**: Bricolage Grotesque (SIL OFL 1.1, ver `public/fonts/OFL.txt`), recortada a los caracteres del español con los ejes de peso y tamaño óptico:
  `pyftsubset` sobre el archivo `latin-standard` de `@fontsource-variable/bricolage-grotesque`, luego `fonttools varLib.instancer ... wdth=100`.
- **Límite de peticiones**: la zona `mariovaldez.dev` tiene una regla de rate limit en todos sus subdominios. Por eso el CSS va dentro del HTML, hay un solo archivo de JS y cada foto tiene una sola versión que se reutiliza entre secciones.
- **Seguridad**: `public/_headers` define la CSP (solo scripts propios, nada inline) y la caché inmutable de `/_astro/*`. No hay llaves ni secretos en el repositorio.

Desarrollado por [Daku](https://daku.com.mx).
