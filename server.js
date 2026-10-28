// --- DEPENDENCIAS ---
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const cookieSession = require('cookie-session');
const { Pool } = require('pg');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// --- SESIONES (cookie firmada, httpOnly, sin estado en servidor) ---
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
    if (req.get('sec-fetch-site') === 'cross-site') {
        return res.status(403).json({ error: 'Origen no permitido' });
    }
    return next();
});

// --- MIDDLEWARES DE AUTORIZACIÓN ---
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'No autenticado' });
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) return res.status(401).json({ error: 'No autenticado' });
    if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    next();
};

const isAdminSession = (req) => Boolean(req.session && req.session.user && req.session.user.role === 'admin');

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

        // Seed admin si no hay usuarios
        const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
        if (parseInt(userCount.rows[0].count) === 0) {
            await pool.query("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)", [
                'Stephanie', 'Step.cam.gam97@gmail.com', 'admin', 'admin'
            ]);
            console.log('👤 Usuario admin creado');
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
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT id, name, email, role FROM users WHERE email=$1 AND password=$2', [email, password]);
        if (result.rows[0]) {
            req.session.user = result.rows[0];
            res.json(result.rows[0]);
        } else res.status(401).json({ error: 'Credenciales inválidas' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Devuelve el usuario de la sesión actual (401 si no hay sesión)
app.get('/api/me', requireAuth, (req, res) => {
    res.json(req.session.user);
});

// Cierra la sesión y borra la cookie
app.post('/api/logout', (req, res) => {
    req.session = null;
    res.json({ success: true });
});

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
        if (existing.rows[0]) return res.status(400).json({ error: 'El correo ya existe' });
        
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role',
            [name, email, password]
        );
        req.session.user = result.rows[0];
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
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
// Sin sesión de admin no se sirve la página (no depende de localStorage ni de JS)
app.get(['/admin.html', '/admin'], (req, res) => {
    if (!isAdminSession(req)) return res.redirect(302, '/login.html?next=admin.html');
    res.sendFile(path.join(__dirname, 'admin.html'));
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
