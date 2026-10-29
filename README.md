# Velass&Esencia — web

Catálogo y panel de administración de velas artesanales. Node.js + Express + PostgreSQL, frontend en HTML/CSS/JS vanilla.

## Requisitos

- Node.js 20 o superior
- PostgreSQL (en producción usamos Neon desde Render)

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | sí | Cadena de conexión PostgreSQL (`postgres://...`) |
| `SESSION_SECRET` | recomendada | Secreto de 32+ caracteres para firmar la cookie de sesión. Si falta, se genera uno temporal y las sesiones se pierden en cada reinicio |
| `PORT` | no | Puerto HTTP (Render lo inyecta) |
| `ADMIN_EMAIL` | no | Email del admin inicial. Solo se usa si la tabla `users` está vacía |
| `ADMIN_PASSWORD` | no | Contraseña del admin inicial (mínimo 8 caracteres) |
| `WHATSAPP_NUMBER` | no | Número por defecto para pedidos (con código de país, sin `+`). Se puede cambiar desde el panel; si la BD no tiene `whatsapp_number`, se usa este valor (`573005798487` por defecto) |
| `ALLOWED_ORIGINS` | no | Lista separada por comas de orígenes CORS permitidos. Por defecto CORS está cerrado (mismo origen) |
| `PUBLIC_URL` | no | URL pública base para canonical/OG/sitemap (p. ej. `https://velass-esencia.onrender.com`). Si falta se deduce de la petición |
| `GA_MEASUREMENT_ID` | no | ID de medición de Google Analytics 4 (p. ej. `G-17KGKVB85Z`). Configurable también desde el panel |
| `META_PIXEL_ID` | no | ID de Pixel de Meta opcional (solo dígitos). Configurable también desde el panel |

No existen credenciales por defecto en el código.

## Pedidos por WhatsApp

Los botones "Pedir por WhatsApp" del catálogo, el formulario de vela personalizada y el botón flotante abren `wa.me` con el mensaje ya redactado (producto, categoría, precio y dirección de envío). El número se configura desde **Panel → Redes Sociales → WhatsApp** y se guarda como setting `whatsapp_number` en la BD; `WHATSAPP_NUMBER` solo actúa como valor inicial.

## Desarrollo local

```bash
npm install
DATABASE_URL=postgres://usuario:clave@localhost:5432/velassesencia \
SESSION_SECRET=dev-secret-cambiame \
npm start
```

La app crea las tablas y los productos de ejemplo al arrancar.

## Precios y ofertas

Cada producto tiene `price` y opcionalmente `discount_price` (precio de oferta). La tienda muestra el precio tachado, el porcentaje de descuento y usa el precio efectivo en el detalle, el carrito y el mensaje de WhatsApp. Se configura desde **Panel → Inventario → Editar producto → "Precio de oferta (opcional)"**; vacío = sin oferta. El servidor rechaza ofertas que no sean estrictamente menores que el precio normal. Las categorías sin productos no se renderizan (p. ej. "Día de la madre" si queda vacía).

## Crear o reiniciar el administrador

```bash
ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD='una-clave-larga' DATABASE_URL=... npm run create-admin
```

Si el usuario ya existe, actualiza la contraseña y cierra sus sesiones abiertas.

También se puede cambiar la contraseña desde la API, autenticado:

```bash
curl -X PUT https://<tu-dominio>/api/users/me/password \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"currentPassword":"la-actual","newPassword":"la-nueva-de-8+"}'
```

## Ficha de producto y reseñas

Cada producto admite datos que ayudan a decidir la compra: **peso (g), duración (h), cera, mecha, notas olfativas y cuidados**, editables en **Panel → Inventario → Editar producto**. Se muestran en `/producto/<slug>` y se publican como `additionalProperty` en el JSON-LD.

Las **reseñas** (autor, valoración 1–5 y comentario) se gestionan desde el mismo modal del producto (listar, añadir, eliminar). Si hay reseñas, la ficha muestra "Opiniones" y el JSON-LD incluye `aggregateRating` y `review`; al borrar un producto se borran sus reseñas.

## SEO y páginas de producto

- Cada producto tiene una URL propia y **renderizada en servidor**: `/producto/<slug>` (slug generado del nombre, único y estable si se renombra).
- Incluye `<title>`, `meta description`, `canonical`, Open Graph/Twitter, `h1`, precio/oferta y **JSON-LD `Product` + `Offer`** (COP, disponibilidad).
- `/sitemap.xml` (portada + productos) y `/robots.txt` (bloquea `/admin.html` y `/api/`).
- La portada inyecta en servidor una lista de enlaces a las fichas de producto (navegación/crawl).
- Rutas desconocidas devuelven **404 real** (antes se servía el index con 200).
- El CTA de la ficha es un enlace `wa.me` generado en servidor: funciona sin JavaScript.

## Analítica y eventos (CV-6)

- **Google Analytics 4 (GA4)** con ID `G-17KGKVB85Z`, configurable también vía variable de entorno `GA_MEASUREMENT_ID` o desde **Panel → Redes Sociales → Google Analytics 4**.
- **Google Consent Mode v2**: banner de cookies transparente (Aceptar / Rechazar) que respeta la privacidad y permite revocar el consentimiento desde el enlace en el pie de página. Si se rechaza, las cookies quedan bloqueadas y no se envían identificadores.
- **Eventos estándar y de conversión**:
  - `view_item`: apertura del modal de producto o visualización de ficha en `/producto/<slug>`.
  - `add_to_cart`: adición de un producto al carrito de compras.
  - `order_intent`: clic en los botones de "Pedir por WhatsApp" (desde ficha, catálogo, carrito, vela personalizada o botón flotante).
  - `finish_test`: finalización del test "Descubre tu vela ideal" con el resultado obtenido.
- **DebugView**: se activa automáticamente en `localhost` o pasando el parámetro `?debug=1` en la URL.
- **Meta Pixel**: soporte opcional configurable desde el panel o `META_PIXEL_ID`.
- **CSP**: directivas actualizadas en `server.js` permitiendo dominios de Google Tag Manager, Google Analytics y Meta.

## Seguridad (estado actual)

- Contraseñas con **bcrypt** (`bcryptjs`; `BCRYPT_ROUNDS` configurable, 10 por defecto). Las contraseñas antiguas en texto plano se migran a hash al arrancar el servidor (y al vuelo en el primer login).
- **Validación de entrada con `zod`** en login, registro, productos, transacciones, settings y cambio de contraseña (longitudes, tipos, precios positivos, fechas `YYYY-MM-DD`). Los campos desconocidos se descartan.
- **Rate limit** en `/api/login` (5 intentos fallidos / 15 min por IP; los logins correctos no cuentan) y `/api/register` (10 / 15 min). Configurable con `LOGIN_RATE_LIMIT_MAX`, `REGISTER_RATE_LIMIT_MAX` y `RATE_LIMIT_WINDOW_MS`; `DISABLE_RATE_LIMIT=1` solo para pruebas.
- Los errores internos responden `{ "error": "Error interno" }` (sin filtrar `err.message`); los JSON malformados o demasiado grandes devuelven 400/413 en JSON.
- Sesión con cookie firmada `httpOnly`/`SameSite=Lax`; 8 h; `Secure` en producción.
- `requireAdmin` en productos, transacciones, usuarios y settings.
- `/admin.html` se sirve solo con sesión de admin (`private/admin.html`, fuera del estático).
- **Estáticos solo desde `public/`**: el resto del repo no se sirve (`server.js`, `package.json`, `lib/`, `private/`, `.git` → 404).
- **CSP con `helmet`** (sin `unsafe-inline` en scripts), `nosniff`, `Referrer-Policy`, `frame-ancestors 'self'`, `object-src 'none'`. CORS cerrado por defecto; ampliable con `ALLOWED_ORIGINS`.
- **Frontend sin XSS**: los datos de la BD se pintan con `textContent`/`escapeHtml`, las URLs de imagen se validan (`http`/`https`) y no hay manejadores inline (compatible con la CSP).
- Pendiente (ver `plan-de-trabajo-velass-esencia.md`): CSRF token con doble envío, money como `NUMERIC`, inventario de materias primas en BD.

## Estructura

```
server.js            API + estáticos desde public/
public/              index.html, login.html, css/, js/ (único directorio servido)
private/admin.html   panel (solo con sesión admin)
lib/                 passwords.js (bcrypt), validation.js (zod), slug.js, product-page.js
scripts/create-admin.js
```
