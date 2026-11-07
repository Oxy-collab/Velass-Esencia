# Plan de trabajo — Velass&Esencia (web)

**Versión:** 1.0 · **Estado:** propuesta para revisar · **Base:** `Velass-Esencia@85ab94b` (`main`)
**Deploy:** Render, automático desde `main` · **Stack:** Node 20+/Express + PostgreSQL (Neon) + HTML/CSS/JS vanilla

---

## 1. Diagnóstico en una frase

La web se ve bien y el test de la vela es un buen gancho, pero **no vende por sí sola** (el pedido termina copiando texto y abriendo Instagram), **no posiciona** (no hay páginas de producto ni SEO) y **la API está completamente abierta**: cualquiera puede leer las finanzas, cambiar precios o borrar productos, con credenciales de admin por defecto en el repo público.

## 2. Objetivos del plan

| # | Objetivo | Métrica de éxito |
|---|----------|------------------|
| O1 | Cerrar la superficie de ataque | 0 endpoints de escritura sin auth · 0 credenciales en el repo · passwords hasheados |
| O2 | Convertir visitas en pedidos | CTA WhatsApp medible · carrito con total · evento `order_intent` en analítica |
| O3 | Ser encontrable | 1 URL indexable por producto · sitemap · JSON-LD validado en Rich Results |
| O4 | Cargar rápido en móvil | LCP < 2.5 s en 4G · catálogo < 600 KB · Lighthouse Perf ≥ 85 |
| O5 | Ser usable por todos | Lighthouse A11y ≥ 95 · navegación por teclado · `prefers-reduced-motion` |
| O6 | Ser mantenible | README + `.env.example` · lockfile versionado · tests + CI |

## 3. Reglas del proyecto

1. **Toda rama se integra por PR**; como `main` despliega automático a Render, **merge = producción**. Etiquetar `v0.x` antes de cada fase para rollback.
2. Un ticket = una rama (`fix/...`, `feat/...`, `chore/...`) = un PR con criterios de aceptación.
3. **Nunca** commitear `.env`, tokens ni contraseñas. Variables en el dashboard de Render.
4. DoD común: criterios del ticket ✅ + prueba manual ✅ + sin secretos ✅ + deploy verificado ✅.
5. Prioridad: **P0** bloqueante, **P1** alto impacto de negocio, **P2** calidad, **P3** nice to have.

## 4. Escala de esfuerzo

| Talla | Esfuerzo | Ejemplo |
|-------|----------|---------|
| XS | ≤ 2 h | favicon, typo, meta tags |
| S | 4–8 h | rate limit, WhatsApp prellenado |
| M | 1–2 días | sesiones + middleware auth, carrito |
| L | 3–5 días | páginas de producto SSR, migraciones DB |

---

## 5. Fase 0 — Seguridad y datos (P0, bloqueante · ~12–16 h)

> No se toca nada más hasta cerrar esta fase. Hoy la web está en producción y abierta.

> **Estado Fase 0 (SEC-1…SEC-6):** ✅ **completa**, mergeada y **desplegada** en Render (`199e36e`) el 2026-10-28 · PRs [#3](https://github.com/Oxy-collab/Velass-Esencia/pull/3), [#4](https://github.com/Oxy-collab/Velass-Esencia/pull/4), [#5](https://github.com/Oxy-collab/Velass-Esencia/pull/5), [#6](https://github.com/Oxy-collab/Velass-Esencia/pull/6) y [#7](https://github.com/Oxy-collab/Velass-Esencia/pull/7). Verificado en producción: **15/15 anónimas** (`/admin.html` → 302, `/api/transactions` → 401, `/server.js` → 404, catálogo 200), **11/11 autenticadas** (login, panel, revocación por logout, CSRF) y **22/22 de SEC-5/6** (CSP sin `unsafe-inline` en scripts, `nosniff`, CORS cerrado, `server.js`/`package.json`/`lib`/`private`/`.git` → 404, 404 de API en JSON, JSON malformado → 400). Migración a bcrypt aplicada en la BD (`password` vacío, `password_hash` `$2b$10$…`), `SESSION_SECRET` creado y contraseña del admin rotada (la vieja `admin` ya no entra). En local: 59 SEC-1 + 20 SEC-2 + 34 SEC-3 + 45 SEC-4 + 42 SEC-5/6. Nota: el servicio tiene **Auto-Deploy desactivado** (`autoDeploy=no`); hay que activarlo en Render para que los merges a `main` se publiquen solos.

### SEC-1 · Autenticación real en la API
- **Talla:** L · **Archivos:** `server.js`, `js/app.js`, `js/admin.js`, `admin.html`
- **Qué:** sesiones con cookie `httpOnly`/`SameSite` (o JWT en cookie) + `requireAuth` y `requireAdmin`. Proteger `POST/PUT/DELETE /api/products`, `POST/DELETE /api/transactions`, `POST /api/settings`, `GET /api/transactions*`, `GET /api/users/count`, `GET /api/settings/:key`.
- **DoD:** `curl -X POST /api/products` sin cookie → **401**; con sesión admin → 201; `/admin.html` sin sesión redirige **desde el servidor**; `localStorage` deja de autorizar nada.

### SEC-2 · Eliminar credenciales por defecto y rotar admin
- **Talla:** XS · **Archivos:** `server.js:62-68`, `.env.example`, README
- **Qué:** borrar `Step.cam.gam97@gmail.com` / `admin` del código. Crear admin desde `ADMIN_EMAIL`/`ADMIN_PASSWORD` en un script `npm run create-admin` (solo ejecución manual) y **cambiar la contraseña del admin que ya está en producción**.
- **DoD:** repo sin credenciales ni email personal; login con la nueva clave; `admin/admin` rechazado.

### SEC-3 · Hash de contraseñas (bcrypt)
- **Talla:** M · **Archivos:** `server.js`, migración DB
- **Qué:** columna `password_hash`; `bcrypt.hash` en registro/alta y `bcrypt.compare` en login; mínimo 8 caracteres; script de migración de usuarios existentes.
- **DoD:** tabla sin contraseñas legibles; usuario existente migra y loguea; registro nuevo guarda hash.

### SEC-4 · Validación de entrada + rate limit
- **Talla:** S · **Archivos:** `server.js`
- **Qué:** `express-rate-limit` en `/api/login` y `/api/register`; validación con `zod` (o `express-validator`) en products/transactions/users; longitudes máximas; números positivos; `express.json({ limit: '100kb' })`.
- **DoD:** 6 intentos de login → **429**; payload inválido → **400** con mensaje claro; `price: "abc"` rechazado.

### SEC-5 · Servir solo estáticos + errores en JSON
- **Talla:** M · **Archivos:** `server.js`, mover `*.html`, `css/`, `js/` → `public/`
- **Qué:** `express.static(path.join(__dirname, 'public'))`; `/server.js` y `/package.json` dejan de ser públicos; 404 JSON para `/api/*` inexistentes; middleware de errores sin `err.message`; `app.get('*')` solo para páginas.
- **DoD:** `GET /server.js` → 404; `GET /api/nope` → **404 JSON**; error 500 genérico; el sitio sigue funcionando.

### SEC-6 · Sanear XSS, CORS y headers
- **Talla:** S · **Archivos:** `js/app.js`, `js/admin.js`, `server.js`, `.html`
- **Qué:** escapar salidas con `textContent`/helper `escapeHtml`; quitar `onclick` inline en producto → `addEventListener` + `dataset`; `cors()` restringido a dominios del sitio (o eliminarlo, mismo origen); `helmet` con CSP compatible con los embeds; `body` con límite.
- **DoD:** producto con `<img src=x onerror=alert(1)>` no ejecuta nada; cabeceras de `helmet` presentes; embeds de IG/TikTok siguen cargando.

### SEC-7 · Auditoría de cierre
- **Talla:** XS · **Archivos:** `SECURITY.md` (matriz de endpoints)
- **Qué:** tabla endpoint → método → público/requiere auth; prueba en incógnito; checklist en CI (falla si aparece una ruta nueva sin middleware).
- **DoD:** matriz completa y firmada; 0 endpoints de escritura abiertos.

---

## 6. Fase 1 — Conversión (P1 · ~20–26 h)

> **Estado CV-1…CV-5:** ✅ implementados, mergeados y **desplegados** (`d19073b`): [PR #8](https://github.com/Oxy-collab/Velass-Esencia/pull/8) (WhatsApp prellenado + número configurable), [PR #9](https://github.com/Oxy-collab/Velass-Esencia/pull/9) (carrito), [PR #10](https://github.com/Oxy-collab/Velass-Esencia/pull/10) (ofertas en BD + secciones vacías ocultas), [PR #11](https://github.com/Oxy-collab/Velass-Esencia/pull/11) (páginas de producto SEO) y [PR #12](https://github.com/Oxy-collab/Velass-Esencia/pull/12) (ficha con especificaciones, cuidados y reseñas). Verificación en producción: CV-1 **15/15**, CV-2 **15/15**, CV-3 **14/14**, CV-4 **23/23** y CV-5 **27/27** (producto temporal con ficha + reseña creado en producción, ficha con specs/cuidados/opiniones y JSON-LD `additionalProperty`/`aggregateRating`/`review`, y limpieza posterior). En local: 34 + 34 + 31 + 31 + 27 pruebas.

### CV-1 · Checkout por WhatsApp prellenado
- **Talla:** S · **Archivos:** `js/app.js:175-188`, `index.html:272`
- **Qué:** sustituir "copiar al portapapeles + abrir Instagram" por `https://wa.me/<num>?text=<mensaje>` con producto, precio, personalización y dirección; Instagram queda como alternativa secundaria; número en `settings` de la BD (hoy está hardcodeado dos veces).
- **DoD:** el click abre WhatsApp con el mensaje completo en móvil y desktop; evento `order_intent` disparado.

### CV-2 · Carrito / pedido múltiple
- **Talla:** M · **Archivos:** `js/app.js`, `index.html`, `css/styles.css`
- **Qué:** botón "Añadir", contador en navbar, drawer con líneas, subtotal, quitar ítem, persistencia en `localStorage`, mensaje de WhatsApp con lista y total.
- **DoD:** 2 productos → mensaje con lista + total; recargar conserva el carrito; vaciar funciona.

### CV-3 · Precio y descuento en la base de datos
- **Talla:** S · **Archivos:** `server.js`, `js/app.js`
- **Qué:** columnas `price`, `discount_price` (o `discount_percent`), precio efectivo calculado en el servidor; quitar el `* 0.9` del cliente y la comparación cruda de categoría en el modal (`js/app.js:605`) usando `normalizeCategory`.
- **DoD:** precio mostrado = precio de la BD; sin lógica de descuento en el frontend; el detalle coincide con la tarjeta.

### CV-4 · Páginas de producto + SEO
- **Talla:** L · **Archivos:** `server.js`, nuevo `views/producto.html`, `public/`
- **Qué:** ruta `/producto/:slug` con HTML renderizado en servidor (o pre-render), `title`/`meta description`/`canonical` por producto, `og:image`, `sitemap.xml`, `robots.txt`, JSON-LD `Product`/`Offer`, 404 real.
- **DoD:** Rich Results Test valida el producto; sitemap subido a Search Console; cada producto tiene URL propia compartible.

### CV-5 · Ficha que vende
- **Talla:** S · **Archivos:** `server.js` (schema), `admin.html`, `js/admin.js`, `js/app.js`
- **Qué:** peso, tiempo de quemado, tipo de cera (soja), tipo de mecha, notas olfativas, cuidados + sección de reseñas/testimonios (inicialmente curadas a mano).
- **DoD:** campos editables en admin y visibles en el detalle; sin productos sin estos datos en semilla.

### CV-6 · Analítica y eventos
- **Talla:** S · **Archivos:** `index.html`, `js/app.js`, nuevo `js/analytics.js`
- **Qué:** GA4 o Plausible + Meta Pixel (opcional); eventos `view_item`, `add_to_cart`, `order_intent`, `finish_test`; banner de consentimiento simple si se añaden cookies.
- **DoD:** eventos visibles en DebugView; `order_intent` cuenta clics a WhatsApp.

### CV-7 · Marca y metadatos
- **Talla:** XS · **Archivos:** `index.html`, `login.html`, `admin.html`
- **Qué:** favicon + `apple-touch-icon`, `og:image` 1200×630, `meta description` en el index, `theme-color`; unificar el nombre (**"Velass&Esencia"** vs "Velas&Esencia" en la historia) y usar el mismo en `<title>`.
- **DoD:** preview correcto al compartir por WhatsApp/IG; una sola grafía de marca.

---

## 7. Fase 2 — UX, accesibilidad y rendimiento (P2 · ~12–16 h)

> **Estado Fase 2 (UX-1…UX-7):** ✅ **completa y verificada**. Implementada con directrices de Apple Human Interface Guidelines y micro-interacciones de Emil Kowalski (Sonner toasts, micro-interactions en botones, sheet/modal elástico con focus trap y ESC, zero-flash theme con script parser-blocking, fallback propio SVG `candle-placeholder.svg`, inventario de materias primas en PostgreSQL con endpoints protegidos y migración automática desde `localStorage`, skeleton loader shimmer en catálogo, skip link y cumplimiento de `prefers-reduced-motion`). Verificado en suites automatizadas `scripts/test-phase2.js` y `scripts/test-api-raw-materials.js`.

| ID | Ticket | Talla | Detalle | DoD |
|----|--------|-------|---------|-----|
| UX-1 | Imágenes propias y optimizadas | M | Logo (hoy en `cdn.phototourl.com`, devuelve 403/riesgo de caída) y fotos al repo o CDN propio; WebP/AVIF; `<img loading="lazy" width height alt>`; fallback local (no `via.placeholder.com`) | 0 peticiones a hosts gratuitos; catálogo < 600 KB; sin CLS |
| UX-2 | Modal accesible | S | `role="dialog"`, `aria-modal`, cierre con ESC, focus trap, `max-height: 90vh; overflow-y:auto`, cerrar con `aria-label`; quitar el `float:right` | Navegable 100% con teclado; no se corta en móvil |
| UX-3 | Tema sin flash | XS | Script inline en `<head>` que aplique `data-theme` antes del primer paint; `prefers-color-scheme` como default | Sin flash al recargar en oscuro; respeta el SO |
| UX-4 | Base de accesibilidad | M | `:focus-visible`, `prefers-reduced-motion` (fondo líquido), `aria-expanded/controls` en hamburguesa, `aria-pressed` en tema, contraste AA, skip link, toasts en vez de `alert()` | Lighthouse A11y ≥ 95; navegación por teclado completa |
| UX-5 | Inventario en la BD | M | Materias primas hoy en `localStorage` (`js/admin.js:542`): tabla + API protegida + migración de lo local | Se ve desde dos navegadores; sobrevive a limpiar datos |
| UX-6 | Fixes HTML/CSS + estados | S | Modal dentro de `<body>` (`index.html:11-18`), typo `liquid-galss` (`:148`), `.sidebar` duplicado (`styles.css:162-167`), skeleton de carga, reintento y estado vacío del catálogo | HTML válido (W3C); sin CSS muerto; catálogo muestra skeleton |
| UX-7 | Test de la vela → pedido | S | En el resultado, CTA "Pedir esta vela" con mensaje prellenado + guardar resultado en analítica | El test termina en WhatsApp; evento `test_result` |

---

## 8. Fase 3 — Robustez técnica y legal (P2/P3 · ~14–18 h)

| ID | Ticket | Talla | Detalle | DoD |
|----|--------|-------|---------|-----|
| TEC-1 | Higiene del proyecto | S | `engines.node` en `package.json`, quitar `sqlite3` (dependencia muerta), **versionar `package-lock.json`** (hoy en `.gitignore`), scripts `dev/lint/test`, README real y `.env.example` | `npm ci` reproduce el deploy; README explica setup y variables |
| TEC-2 | Modelo de datos correcto | M | Dinero en `NUMERIC`/entero de pesos (hoy `REAL`), `transactions.date` como `DATE` (hoy `TEXT` con `LIKE`), índices; migraciones versionadas (`node-pg-migrate`) en vez de `initDb` | Migración aplicada; consultas por rango; sin floats para dinero |
| TEC-3 | Operación en Render | S | `/healthz`, `pool.on('error')`, graceful shutdown (`SIGTERM` + `pool.end()`), logs estructurados (`pino`), Sentry opcional | Deploy sin caídas; healthcheck verde; alerta de errores |
| TEC-4 | Tests + CI | M | `node:test` + `supertest` para auth/validación/health; GitHub Actions (lint + test) | CI en verde en cada PR; al menos 1 test por endpoint crítico |
| TEC-5 | Legal (Colombia) | M | Política de tratamiento de datos (Ley 1581), términos y condiciones, envíos/devoluciones, checkbox de consentimiento en registro, aviso de cookies si aplica analítica | Páginas publicadas y enlazadas desde el footer y el registro |

---

## 9. Cronograma sugerido (4 semanas)

| Semana | Foco | Tickets | Criterio de salida |
|--------|------|---------|--------------------|
| 1 | **Seguridad** | SEC-1…SEC-7 | 0 endpoints abiertos; admin rotado; passwords hasheados |
| 2 | **Conversión base** | CV-1, CV-3, CV-7, CV-6, UX-1, UX-3 | Pedido por WhatsApp prellenado y medido; imágenes propias |
| 3 | **Venta y descubrimiento** | CV-2, CV-4, CV-5, UX-2, UX-7 | Carrito + páginas de producto indexables |
| 4 | **Calidad y legal** | UX-4, UX-5, UX-6, TEC-1…TEC-5 | Lighthouse ≥ objetivos; CI; páginas legales |

**Total estimado:** 58–76 h de desarrollo (≈ 2,5–3 semanas de una persona a tiempo completo, sin contar contenido/fotos ni revisiones legales).

## 10. KPIs y verificación

- **Seguridad:** checklist de endpoints automatizado en CI (falla si una ruta de escritura no tiene `requireAdmin`).
- **Rendimiento:** Lighthouse móvil → Perf ≥ 85, A11y ≥ 95, SEO ≥ 95, Best Practices ≥ 95; LCP < 2.5 s; catálogo < 600 KB.
- **Negocio:** `order_intent` (clics a WhatsApp) por sesión; pedidos confirmados/mes; origen del tráfico (IG/TikTok/Google).
- **SEO:** páginas indexadas en Search Console; 0 errores de Rich Results.
- **Calidad:** 0 errores 500 en Render; 0 imágenes rotas.

## 11. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `main` despliega automático: un merge roto tumba la tienda | Alto | Ramas + PR, tag `v0.x` antes de cada fase, rollback por tag en Render |
| Cambiar auth deja fuera al admin existente | Medio | Script de rotación probado en staging; plan de rollback documentado |
| Migraciones en Neon sin backup | Alto | Backup antes de cada migración; migraciones idempotentes |
| Hosts gratuitos de imágenes caen | Medio | UX-1 primero (migrar a assets propios) |
| Pasarela de pago añade complejidad legal/contable | Medio | Fase 1 solo WhatsApp; evaluar Wompi/MercadoPago después con CV-1 medido |

## 12. Fuera de alcance (por ahora)

Pasarela de pago completa, integración con courier, cuentas de cliente avanzadas, multiidioma, app móvil, programa de puntos, facturación electrónica.

## 13. Cómo arrancamos (próximos 3 pasos)

1. Revisar y ajustar este plan (prioridades y estimaciones).
2. Convertir los tickets P0/P1 en **issues de GitHub** (con labels `p0`, `security`, `conversion`…) y activar **Render PR previews**.
3. Ejecutar SEC-1 en rama `fix/api-auth` con PR revisado; al mergear, rotar credenciales y verificar en incógnito.
