const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

const DB_PATH = path.join(__dirname, 'velassesencia.db');
let db;

// Helper: save DB to disk
function saveDb() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

async function initDatabase() {
    const SQL = await initSqlJs();

    // Load existing DB or create new one
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('✅ Base de datos cargada desde archivo');
    } else {
        db = new SQL.Database();
        console.log('✅ Base de datos nueva creada');
    }

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'Linea Bloom',
            description TEXT,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            img TEXT DEFAULT ''
        );
    `);

    // Seed admin if no users exist
    const userCount = db.exec('SELECT COUNT(*) as count FROM users');
    if (userCount[0].values[0][0] === 0) {
        db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", ['Admin', 'admin@velassesencia.com', 'admin', 'admin']);
        console.log('✅ Admin por defecto creado: admin@velassesencia.com / admin');
    }

    // Seed products if none exist
    const productCount = db.exec('SELECT COUNT(*) as count FROM products');
    if (productCount[0].values[0][0] === 0) {
        const products = [
            ['Bloom mediana', 'Linea Bloom', 'Vela en envase de vidrio con acabado floral decorativo.', 16000, 50, ''],
            ['Bloom grande', 'Linea Bloom', 'Versión con mayor duración.', 24000, 30, ''],
            ['Set Corazón', 'Mini Scents', '2 velas medianas.', 15000, 40, ''],
            ['Set Rosas', 'Mini Scents', '4 velas pequeñas. Perfectas para elegir tu aroma favorito.', 18000, 40, ''],
            ['Terrario', 'Terrario', 'Decorada con estilo natural (tipo cactus o jardín). Perfecta como pieza decorativa.', 30000, 20, ''],
            ['Mascota personalizada', 'Linea Pet soul', 'Convierte a tu mascota en un recuerdo único.', 32000, 15, ''],
            ['Mascota en base de barro', 'Linea Pet soul', 'Incluye base decorativa.', 40000, 10, '']
        ];
        products.forEach(p => {
            db.run("INSERT INTO products (name, category, description, price, stock, img) VALUES (?, ?, ?, ?, ?, ?)", p);
        });
        console.log('✅ Productos por defecto creados');
    }

    saveDb();
}

// Helper: get rows as array of objects
function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

function queryOne(sql, params = []) {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

// --- API ROUTES: PRODUCTS ---

app.get('/api/products', (req, res) => {
    try {
        const products = queryAll('SELECT * FROM products ORDER BY id ASC');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock, img } = req.body;
    try {
        db.run('INSERT INTO products (name, category, description, price, stock, img) VALUES (?, ?, ?, ?, ?, ?)',
            [name, category || 'Linea Boom', description, price, stock, img || '']);
        saveDb();
        const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
        const product = queryOne('SELECT * FROM products WHERE id = ?', [lastId]);
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, category, description, price, stock, img } = req.body;
    try {
        db.run('UPDATE products SET name=?, category=?, description=?, price=?, stock=?, img=? WHERE id=?',
            [name, category || 'Linea Boom', description, price, stock, img || '', parseInt(id)]);
        saveDb();
        const product = queryOne('SELECT * FROM products WHERE id = ?', [parseInt(id)]);
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.run('DELETE FROM products WHERE id=?', [parseInt(id)]);
        saveDb();
        res.json({ message: 'Producto eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- API ROUTES: USERS ---

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    try {
        const user = queryOne('SELECT id, name, email, role FROM users WHERE email=? AND password=?', [email, password]);
        if (user) {
            res.json(user);
        } else {
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    try {
        // Check if email exists
        const existing = queryOne('SELECT id FROM users WHERE email=?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'El correo ya existe' });
        }
        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
        saveDb();
        const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
        const user = queryOne('SELECT id, name, email, role FROM users WHERE id = ?', [lastId]);
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/count', (req, res) => {
    try {
        const result = db.exec('SELECT COUNT(*) as count FROM users');
        res.json({ count: result[0].values[0][0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback: serve index.html for any non-API route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server after DB init
const PORT = process.env.PORT || 3000;
initDatabase().then(() => {
    app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
}).catch(err => {
    console.error('❌ Error iniciando la base de datos:', err);
});
