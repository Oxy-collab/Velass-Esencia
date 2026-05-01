// --- DEPENDENCIAS ---
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

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

app.post('/api/products', async (req, res) => {
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

app.put('/api/products/:id', async (req, res) => {
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

app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API: TRANSACCIONES ---
app.post('/api/transactions', async (req, res) => {
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

app.get('/api/transactions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/transactions/:month', async (req, res) => {
    const { month } = req.params;
    try {
        const result = await pool.query('SELECT * FROM transactions WHERE date LIKE $1 ORDER BY date DESC', [`${month}%`]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
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
        if (result.rows[0]) res.json(result.rows[0]);
        else res.status(401).json({ error: 'Credenciales inválidas' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM users');
        res.json({ count: result.rows[0].count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API: SETTINGS ---
app.get('/api/settings/:key', async (req, res) => {
    try {
        const result = await pool.query('SELECT value FROM settings WHERE key=$1', [req.params.key]);
        res.json({ value: result.rows[0] ? result.rows[0].value : null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
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
