// --- DEPENDENCIAS ---
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const cookieSession = require('cookie-session');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { hashPassword, verifyPassword, migrateLegacyPasswords } = require('./lib/passwords');
const {
    loginSchema,
    registerSchema,
    passwordChangeSchema,
    productSchema,
    transactionSchema,
    settingSchema,
    monthSchema,
    idSchema,
    validateBody,
    validateParam
} = require('./lib/validation');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// --- CORS ---
// Por defecto no se emiten cabeceras CORS (el frontend es del mismo origen).
// Si hay otros consumidores, se declaran explícitamente en ALLOWED_ORIGINS.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
if (allowedOrigins.length > 0) {
    app.use(cors({ origin: allowedOrigins, credentials: true }));
}

// --- CABECERAS DE SEGURIDAD (CSP compatible con los CDNs y embeds del sitio) ---
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"],
            formAction: ["'self'"],
            scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://www.tiktok.com', 'https://*.tiktok.com', 'https://www.instagram.com', 'https://*.instagram.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'data:'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://www.tiktok.com', 'https://*.tiktok.com', 'https://www.instagram.com', 'https://*.instagram.com'],
            frameSrc: ['https://www.tiktok.com', 'https://*.tiktok.com', 'https://www.instagram.com', 'https://*.instagram.com']
        }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(express.json({ limit: '100kb' }));

// --- RATE LIMITING (login y registro) ---
// Los intentos fallidos de login cuentan; los exitosos no (no bloquean a usuarios legítimos).
const rateLimitDisabled = process.env.DISABLE_RATE_LIMIT === '1';
const RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const LOGIN_MAX = Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5;
const REGISTER_MAX = Number(process.env.REGISTER_RATE_LIMIT_MAX) || 10;
const noLimiter = (req, res, next) => next();

const loginLimiter = rateLimitDisabled ? noLimiter : rateLimit({
    windowMs: RATE_WINDOW_MS,
    limit: LOGIN_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.' }
});

const registerLimiter = rateLimitDisabled ? noLimiter : rateLimit({
    windowMs: RATE_WINDOW_MS,
    limit: REGISTER_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados registros desde esta IP. Inténtalo más tarde.' }
});

// --- SESIONES (cookie firmada, httpOnly) ---
// Además de la firma, cada petición comprueba que el usuario siga existiendo y que
// su session_version no haya cambiado: así el logout (o un cambio de clave/rol)
// invalida cookies ya emitidas, aunque la cookie sea válida criptográficamente.
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    if (isProduction) {
        console.warn('⚠️  SESSION_SECRET no definido: se usa uno temporal y las sesiones se invalidarán al reiniciar. Configúralo en Render.');
    }
    sessionSecret = crypto.randomBytes(32).toString('hex');
}
app.use(cookieSession({
    name: 'ves.sid',
    keys: [sessionSecret],
    maxAge: 8 * 60 * 60 * 1000, // 8 h
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction
}));

// --- PROTECCIÓN CSRF BÁSICA (Origin / Sec-Fetch-Site) ---
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
app.use((req, res, next) => {
    if (!MUTATING_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin) {
        try {
            if (new URL(origin).host === req.get('host')) return next();
        } catch (err) { /* origen inválido: se rechaza abajo */ }
        return res.status(403).json({ error: 'Origen no permitido' });
    }
    // Sin Origin (curl/API): solo se exime si el navegador declara same-origin/none
    const site = req.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') {
        return res.status(403).json({ error: 'Origen no permitido' });
    }
    return next();
});

// --- MIDDLEWARES DE AUTORIZACIÓN ---
const sessionUser = async (req) => {
    const s = req.session && req.session.user;
    if (!s || !s.id) return null;
    const result = await pool.query('SELECT session_version FROM users WHERE id=$1', [s.id]);
    if (!result.rows[0]) return null;
    if (Number(result.rows[0].session_version) !== Number(s.sv)) return null;
    return s;
};

const requireAuth = async (req, res, next) => {
    try {
        const user = await sessionUser(req);
        if (!user) {
            req.session = null;
            return res.status(401).json({ error: 'No autenticado' });
        }
        req.sessionUser = user;
        next();
    } catch (err) {
        console.error('Error validando la sesión:', err);
        res.status(500).json({ error: 'Error interno' });
    }
};

const requireAdmin = (req, res, next) => requireAuth(req, res, () => {
    if (req.sessionUser.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    next();
});

// --- CONEXIÓN A POSTGRESQL ---
// Render y Neon requieren SSL para conexiones externas
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Mensaje de conexión
pool.on('connect', () => {
    console.log('✅ Conectado a la base de datos PostgreSQL');
});

// --- INICIALIZACIÓN DE TABLAS ---
const initDb = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )`);

        // Columna de revocación de sesiones (idempotente para bases ya creadas)
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0');

        // Contraseñas: columna de hash + migración de las que estaban en texto plano.
        // La columna antigua `password` queda como cadena vacía (sin secreto).
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
        const migrated = await migrateLegacyPasswords(pool);
        if (migrated > 0) {
            console.log(`🔐 ${migrated} contraseña(s) migradas a hash bcrypt`);
        }

        await pool.query(`CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'línea Bloom',
            description TEXT,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            img TEXT DEFAULT ''
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // Seed admin SOLO si se configuró ADMIN_EMAIL/ADMIN_PASSWORD.
        // Nunca se crean credenciales por defecto en el código.
        const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
        if (parseInt(userCount.rows[0].count) === 0) {
            if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
                if (String(process.env.ADMIN_PASSWORD).length < 8) {
                    console.warn('⚠️  ADMIN_PASSWORD debe tener al menos 8 caracteres: no se creó el admin.');
                } else {
                    const adminHash = await hashPassword(process.env.ADMIN_PASSWORD);
                    await pool.query("INSERT INTO users (name, email, password, password_hash, role) VALUES ($1, $2, $3, $4, $5)", [
                        'Admin', process.env.ADMIN_EMAIL, '', adminHash, 'admin'
                    ]);
                    console.log('👤 Usuario admin creado desde ADMIN_EMAIL/ADMIN_PASSWORD');
                }
            } else {
                console.warn('ℹ️  No hay usuarios: define ADMIN_EMAIL y ADMIN_PASSWORD (o ejecuta npm run create-admin) para crear el admin.');
            }
        }

        // Seed productos si está vacío
        const productCount = await pool.query('SELECT COUNT(*) as count FROM products');
        if (parseInt(productCount.rows[0].count) === 0) {
            const products = [
                ['Bloom mediana', 'Línea Bloom', 'Vela en envase de vidrio con acabado floral decorativo.', 16000, 50, "https://image2url.com/r2/default/images/1774500184090-f4e22a54-d1e1-4127-b289-8504aa0c7e0f.png"],
                ['Bloom grande', 'Línea Bloom', 'Versión con mayor duración.', 25000, 30, "https://image2url.com/r2/default/images/1774500136789-712ec0b7-e753-4547-9123-44a42a27b881.png"],
                ['Set Corazón', 'Mini Scents', '2 velas medianas.', 15000, 40, "https://image2url.com/r2/default/images/1774539969550-b67adcd9-110f-410c-8837-cbedca573d74.png"],
                ['Set Rosas', 'Mini Scents', '4 velas pequeñas. Perfectas para elegir tu aroma favorito.', 18000, 40, "https://image2url.com/r2/default/images/1774540024937-11d17a21-55a1-4590-914a-be3dc3fe7a04.png"],
                ['Terrario', 'Terrario', 'Decorada con estilo natural (tipo cactus o jardín). Perfecta como pieza decorativa.', 30000, 20, "https://image2url.com/r2/default/images/1774456169936-048cc335-e743-44f8-bd9b-7a5895f7a59f.png"],
                ['Mascota personalizada', 'Linea Pet soul', 'Convierte a tu mascota en un recuerdo único.', 32000, 15, "https://image2url.com/r2/default/images/1774456213828-a2b210eb-a703-4641-b1f0-5002154caa8c.png"],
                ['Mascota en base de barro', 'Linea Pet soul', 'Incluye base decorativa.', 40000, 10, "https://image2url.com/r2/default/images/1774456258303-f585d637-ac43-4298-bb7b-5ddef781e81b.png"]
            ];

            for (const p of products) {
                await pool.query("INSERT INTO products (name, category, description, price, stock, img) VALUES ($1, $2, $3, $4, $5, $6)", p);
            }
            console.log('📦 Productos iniciales creados');
        }
    } catch (err) {
        console.error('❌ Error inicializando la base de datos:', err);
    }
};

initDb();

// --- API: PRODUCTOS ---
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.post('/api/products', requireAdmin, validateBody(productSchema), async (req, res) => {
    const { name, category, description, price, stock, img } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (name, category, description, price, stock, img) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, category || 'línea Bloom', description, price, stock, img || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.put('/api/products/:id', requireAdmin, validateParam('id', idSchema), validateBody(productSchema), async (req, res) => {
    const { id } = req.params;
    const { name, category, description, price, stock, img } = req.body;
    try {
        const result = await pool.query(
            'UPDATE products SET name=$1, category=$2, description=$3, price=$4, stock=$5, img=$6 WHERE id=$7 RETURNING *',
            [name, category || 'línea Bloom', description, price, stock, img || '', id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.delete('/api/products/:id', requireAdmin, validateParam('id', idSchema), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// --- API: TRANSACCIONES ---
app.post('/api/transactions', requireAdmin, validateBody(transactionSchema), async (req, res) => {
    const { type, category, amount, date, description } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO transactions (type, category, amount, date, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [type, category, amount, date, description || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/transactions', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/transactions/:month', requireAdmin, validateParam('month', monthSchema), async (req, res) => {
    const { month } = req.params;
    try {
        const result = await pool.query('SELECT * FROM transactions WHERE date LIKE $1 ORDER BY date DESC', [`${month}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.delete('/api/transactions/:id', requireAdmin, validateParam('id', idSchema), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// --- API: USERS ---
app.post('/api/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
    const { email, password } = req.body || {};
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, session_version, password_hash, password FROM users WHERE email=$1',
            [email]
        );
        const row = result.rows[0];
        let valid = false;

        if (row) {
            if (row.password_hash) {
                valid = await verifyPassword(password, row.password_hash);
            } else if (row.password) {
                // Compatibilidad con contraseñas antiguas en texto plano: se migran al vuelo
                valid = String(password) === String(row.password);
                if (valid) {
                    const hash = await hashPassword(password);
                    await pool.query("UPDATE users SET password_hash=$1, password='' WHERE id=$2", [hash, row.id]);
                }
            }
        }

        if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

        req.session.user = { id: row.id, name: row.name, email: row.email, role: row.role, sv: row.session_version };
        res.json({ id: row.id, name: row.name, email: row.email, role: row.role });
    } catch (err) {
        console.error('Error en el login:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Devuelve el usuario de la sesión actual (401 si no hay sesión válida)
app.get('/api/me', requireAuth, (req, res) => {
    const u = req.sessionUser;
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
});

// Cierra la sesión: invalida en el servidor (bump de session_version) y borra la cookie
app.post('/api/logout', async (req, res) => {
    const current = req.session && req.session.user;
    if (current && current.id) {
        try {
            await pool.query('UPDATE users SET session_version = session_version + 1 WHERE id=$1', [current.id]);
        } catch (err) {
            console.error('Error invalidando la sesión:', err);
        }
    }
    req.session = null;
    res.json({ success: true });
});

app.post('/api/register', registerLimiter, validateBody(registerSchema), async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
        if (existing.rows[0]) return res.status(400).json({ error: 'El correo ya existe' });

        const passwordHash = await hashPassword(password);
        const result = await pool.query(
            "INSERT INTO users (name, email, password, password_hash) VALUES ($1, $2, '', $3) RETURNING id, name, email, role",
            [name, email, passwordHash]
        );
        const user = result.rows[0];
        req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, sv: 0 };
        res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (err) {
        console.error('Error en el registro:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Cambio de contraseña del propio usuario (requiere la contraseña actual).
// Al cambiarla se incrementa session_version: se cierran todas sus sesiones.
app.put('/api/users/me/password', requireAuth, validateBody(passwordChangeSchema), async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const result = await pool.query('SELECT password_hash, password FROM users WHERE id=$1', [req.sessionUser.id]);
        const row = result.rows[0];
        let valid = false;
        if (row && row.password_hash) {
            valid = await verifyPassword(currentPassword, row.password_hash);
        } else if (row && row.password) {
            valid = String(currentPassword) === String(row.password);
        }
        if (!valid) return res.status(403).json({ error: 'La contraseña actual no es correcta' });

        const newHash = await hashPassword(newPassword);
        await pool.query(
            "UPDATE users SET password_hash=$1, password='', session_version=session_version+1 WHERE id=$2",
            [newHash, req.sessionUser.id]
        );
        req.session = null;
        res.json({ success: true, message: 'Contraseña actualizada. Inicia sesión de nuevo.' });
    } catch (err) {
        console.error('Error cambiando la contraseña:', err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.get('/api/users/count', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM users');
        res.json({ count: result.rows[0].count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// --- API: SETTINGS ---
// Claves públicas que usa la portada: social_* (embeds) y whatsapp_number (pedidos).
const publicSettingKey = (key) => {
    const value = String(key);
    return value.startsWith('social_') || value === 'whatsapp_number';
};

// Valor por defecto si la clave pública no está guardada en la BD.
const PUBLIC_SETTING_DEFAULTS = {
    whatsapp_number: process.env.WHATSAPP_NUMBER || '573005798487'
};

app.get('/api/settings/:key', (req, res, next) => {
    if (publicSettingKey(req.params.key)) return next();
    return requireAdmin(req, res, next);
}, async (req, res) => {
    try {
        const result = await pool.query('SELECT value FROM settings WHERE key=$1', [req.params.key]);
        const stored = result.rows[0] ? result.rows[0].value : null;
        const value = stored || PUBLIC_SETTING_DEFAULTS[req.params.key] || null;
        res.json({ value });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.post('/api/settings', requireAdmin, validateBody(settingSchema), async (req, res) => {
    const { key, value } = req.body;

    // El número de WhatsApp se guarda normalizado (solo dígitos, 10-15) para que
    // el enlace wa.me sea válido.
    let finalValue = value;
    if (key === 'whatsapp_number') {
        const digits = String(value).replace(/\D/g, '');
        if (!/^\d{10,15}$/.test(digits)) {
            return res.status(400).json({ error: 'Número de WhatsApp inválido (usa 10-15 dígitos con código de país)' });
        }
        finalValue = digits;
    }

    try {
        await pool.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',
            [key, finalValue]
        );
        res.json({ success: true, key, value: finalValue });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// --- PANEL ADMIN: guardia del lado del servidor ---
// admin.html vive fuera del directorio estático para que no se pueda alcanzar
// con variantes codificadas del path (%61dmin.html, //admin.html, etc.).
app.get(['/admin', '/admin/'], (req, res) => res.redirect(302, '/admin.html'));

app.get('/admin.html', async (req, res) => {
    try {
        const user = await sessionUser(req);
        if (!user) {
            req.session = null;
            return res.redirect(302, '/login.html?next=admin.html');
        }
        if (user.role !== 'admin') return res.redirect(302, '/login.html?next=admin.html');
        res.sendFile(path.join(__dirname, 'private', 'admin.html'));
    } catch (err) {
        console.error('Error validando el acceso al panel:', err);
        res.status(500).type('text/plain').send('Error interno');
    }
});

// --- BLOQUEO DE ARCHIVOS SENSIBLES DEL REPO ---
const BLOCKED_STATIC = /^\/(?:\.git(?:\/|$)|\.env|node_modules(?:\/|$)|private(?:\/|$)|lib(?:\/|$)|scripts(?:\/|$)|server\.js$|package(?:-lock)?\.json$|README\.md$)/i;
app.use((req, res, next) => {
    let pathname;
    try {
        pathname = decodeURIComponent(req.path);
    } catch (err) {
        return res.status(400).type('text/plain').send('Bad request');
    }
    pathname = pathname.replace(/\/{2,}/g, '/');
    if (BLOCKED_STATIC.test(pathname)) return res.status(404).type('text/plain').send('Not found');
    next();
});

// --- Fallback: estáticos y SPA ---
app.use(express.static(path.join(__dirname, 'public')));

// Las rutas /api que no existen responden JSON 404 (no el index.html)
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado' }));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- MANEJO DE ERRORES (JSON, sin filtrar detalles internos) ---
app.use((err, req, res, next) => {
    console.error('Error no controlado:', err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'JSON inválido' });
    }
    if (status === 413) {
        return res.status(413).json({ error: 'Cuerpo de la petición demasiado grande' });
    }
    if (req.path.startsWith('/api')) {
        return res.status(status).json({ error: status >= 500 ? 'Error interno' : 'Solicitud inválida' });
    }
    res.status(status).type('text/plain').send('Error');
});

// --- Run server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

