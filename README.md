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
lib/                 passwords.js (bcrypt) y validation.js (zod)
scripts/create-admin.js
```
