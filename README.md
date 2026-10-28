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

No existen credenciales por defecto en el código.

## Desarrollo local

```bash
npm install
DATABASE_URL=postgres://usuario:clave@localhost:5432/velassesencia \
SESSION_SECRET=dev-secret-cambiame \
npm start
```

La app crea las tablas y los productos de ejemplo al arrancar.

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
- Los errores internos responden `{ "error": "Error interno" }` (sin filtrar `err.message`).
- Sesión con cookie firmada `httpOnly`/`SameSite=Lax`; 8 h; `Secure` en producción.
- `requireAdmin` en productos, transacciones, usuarios y settings.
- `/admin.html` se sirve solo con sesión de admin (`private/admin.html`, fuera del estático).
- Bloqueo de `/.git`, `node_modules`, `server.js`, `package.json` y similares en el estático.
- Pendiente (ver `plan-de-trabajo-velass-esencia.md`): CSP/XSS, mover estáticos a `public/`, CSRF token, money como `NUMERIC`.

## Estructura

```
server.js            API + servido de estáticos
private/admin.html   panel (solo con sesión admin)
index.html           catálogo
login.html           acceso
css/ js/             estilos y lógica de cliente
scripts/create-admin.js
```
