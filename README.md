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

## Marca y metadatos (CV-7)

- **Nombre de marca unificado**: **"Velass&Esencia"** estandarizado en títulos, historia de marca, Open Graph y JSON-LD (corrigiendo la errata previa "Velas&Esencia").
- **Favicon y app icons multiplataforma**:
  - `favicon.svg`: icono vectorial escalable moderno con la vela y llama dorada artesanal.
  - `favicon.ico`: icono multirresolución (16x16, 32x32, 48x48) para navegadores tradicionales y pestañas.
  - `apple-touch-icon.png` (180×180) para dispositivos Apple / iOS Safari.
  - `favicon-32x32.png` y `favicon-16x16.png` para compatibilidad universal.
  - `site.webmanifest` con metadatos PWA y color de tema `#8E44AD`.
- **Previsualizaciones en redes sociales (WhatsApp, Instagram, Twitter, Facebook)**:
  - `og:image` de 1200×630 en `public/images/og-image.jpg` con diseño de marca, tipografía y sellos de cera 100% de soja.
  - Etiquetas Open Graph y Twitter Cards completas (`og:title`, `og:description`, `og:url`, `og:image`, `og:locale=es_CO`, `twitter:card=summary_large_image`).
  - Fallback automático en fichas de producto al `og-image.jpg` general si el producto no dispone de fotografía propia.
- **Logotipo vectorial local**: servido directamente desde `/images/logo.svg` (con fallback `/images/logo.png`), eliminando dependencias de CDNs externos caídos.

## UX, accesibilidad y rendimiento (Fase 2)

- **UX-1 · Imágenes propias y optimizadas**:
  - Fallback vectorial propio `public/images/candle-placeholder.svg` (diseño de marca, libre de dependencias externas como `placehold.co`).
  - Atributos `loading="lazy"`, `width="400"`, `height="300"`, `alt` descriptivo y manejadores de error `onerror` automáticos para eliminar el CLS (Cumulative Layout Shift = 0).
- **UX-2 · Modal accesible**:
  - Modal de producto con `role="dialog"`, `aria-modal="true"`, `aria-labelledby="product-detail-modal-title"`.
  - Focus trap con teclado (`Tab` y `Shift+Tab` confinados al diálogo activo).
  - Cierre con tecla `Escape` y clic fuera.
  - Restauración automática del foco al botón o tarjeta que abrió el modal al cerrarse.
  - Vista adaptativa en móvil: `max-height: 90vh; overflow-y: auto;` y botón de cierre `.modal-close-btn` con tamaño táctil de 40×40px.
- **UX-3 · Tema sin flash (Zero-flash theme)**:
  - Script parser-blocking `/js/theme-init.js` en `<head>` de todas las vistas (`index.html`, `login.html`, `admin.html` y fichas `/producto/:slug`), aplicando `data-theme` antes del primer paint.
  - Detección automática del tema del sistema operativo (`prefers-color-scheme: dark`) si no hay preferencia guardada.
  - Sincronización de iconos sol/luna y atributo `aria-pressed` en el botón de alternar tema.
- **UX-4 · Base de accesibilidad (Apple HIG & Emil Kowalski)**:
  - Estilos `:focus-visible` con anillos accesibles limpios (`outline: 2px solid var(--primary-color); outline-offset: 3px`).
  - `@media (prefers-reduced-motion: reduce)`: detiene ondas del fondo líquido, animaciones shimmer y transiciones pesadas.
  - Menú hamburguesa con `aria-expanded` y `aria-controls="sidebar-menu"`.
  - Enlace de salto rápido `<a href="#main-content" class="skip-link">` al inicio del body.
  - Sistema de notificaciones flotantes `Toast` (inspirado en Sonner) con animación elástica de entrada/salida, pause on hover, `role="status"` y `aria-live="polite"`, reemplazando todas las llamadas nativas a `alert()`.
- **UX-5 · Inventario de materias primas en base de datos**:
  - Tabla `raw_materials` en PostgreSQL/Neon con columnas `name`, `category`, `qty`, `unit`, `min_qty`, `cost`, `notes`, `created_at` y `updated_at`.
  - API protegida con `requireAdmin`: `GET/POST /api/raw-materials`, `PUT /api/raw-materials/:id`, `DELETE /api/raw-materials/:id`.
  - Validación de esquemas con `zod` (`rawMaterialSchema` y `rawMaterialBulkSchema`).
  - Migración automática y transparente desde `localStorage` al iniciar el panel de administración.
- **UX-6 · Fixes HTML/CSS y estados de carga**:
  - Modal de detalle reubicado dentro del `<body>` (HTML 100% válido).
  - Corrección de la errata `liquid-galss` -> `liquid-glass`.
  - Eliminación de la regla duplicada `[data-theme="dark"] .sidebar` en `styles.css`.
  - Skeleton loader con animación shimmer (Emil Kowalski) mientras se cargan los productos del catálogo.
  - Estado vacío atractivo cuando no hay productos y estado de error con botón de "Reintentar".
- **UX-7 · Test de la vela → pedido y conversión**:
  - Resultado del test con botón primario "Pedir esta vela por WhatsApp" con mensaje prellenado específico de la vela ideal recomendada.
  - Botón secundario para "Añadir recomendación al carrito".
  - Disparo de eventos analíticos `test_result` y `order_intent`.

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
- Pendiente (ver `plan-de-trabajo-velass-esencia.md`): CSRF token con doble envío, money como `NUMERIC` (Fase 3).

## Estructura

```
server.js            API + estáticos desde public/
public/              index.html, login.html, css/, js/ (único directorio servido)
private/admin.html   panel (solo con sesión admin)
lib/                 passwords.js (bcrypt), validation.js (zod), slug.js, product-page.js
scripts/create-admin.js
```
