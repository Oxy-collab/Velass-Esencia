// --- DEPENDENCIAS ---
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const cookieSession = require('cookie-session');
const { Pool } = require('pg');
const { hashPassword, verifyPassword, migrateLegacyPasswords } = require('./lib/passwords');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// --- SESIONES (cookie firmada, httpOnly) ---
// Además de la firma, cada petición comprueba que el usuario siga existiendo y que
// su session_version no haya cambiado: así el logout (o un cambio de clave/rol)
// invalida cookies ya emitidas, aunque la cookie sea válida criptográficamente.
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
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
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', requireAdmin, async (req, res) => {
    const { name, category, description, price, stock, img } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (name, category, description, price, stock, img) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, category || 'línea Bloom', description, price, stock, img || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, category, description, price, stock, img } = req.body;
    try {
        const result = await pool.query(
            'UPDATE products SET name=$1, category=$2, description=$3, price=$4, stock=$5, img=$6 WHERE id=$7 RETURNING *',
            [name, category || 'línea Bloom', description, price, stock, img || '', id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API: TRANSACCIONES ---
app.post('/api/transactions', requireAdmin, async (req, res) => {
    const { type, category, amount, date, description } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO transactions (type, category, amount, date, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [type, category, amount, date, description || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/transactions', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/transactions/:month', requireAdmin, async (req, res) => {
    const { month } = req.params;
    try {
        const result = await pool.query('SELECT * FROM transactions WHERE date LIKE $1 ORDER BY date DESC', [`${month}%`]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API: USERS ---
app.post('/api/login', async (req, res) => {
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

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Faltan nombre, correo o contraseña' });
    }
    if (String(password).length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
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
app.put('/api/users/me/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Faltan la contraseña actual y la nueva' });
    }
    if (String(newPassword).length < 8) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
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
        res.status(500).json({ error: err.message });
    }
});

// --- API: SETTINGS ---
// Las claves social_* son públicas (las usa la portada); el resto requiere admin.
const publicSettingKey = (key) => String(key).startsWith('social_');

app.get('/api/settings/:key', (req, res, next) => {
    if (publicSettingKey(req.params.key)) return next();
    return requireAdmin(req, res, next);
}, async (req, res) => {
    try {
        const result = await pool.query('SELECT value FROM settings WHERE key=$1', [req.params.key]);
        res.json({ value: result.rows[0] ? result.rows[0].value : null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', requireAdmin, async (req, res) => {
    const { key, value } = req.body;
    try {
        await pool.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',
            [key, value]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
const BLOCKED_STATIC = /^\/(?:\.git(?:\/|$)|\.env|node_modules(?:\/|$)|server\.js$|package(?:-lock)?\.json$|README\.md$)/i;
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

// --- Fallback: static & SPA ---
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Run server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
