// --- DEPENDENCIAS ---
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

// --- BASE DE DATOS ---
const DB_PATH = path.join(__dirname, 'velassesencia.db'); // archivo físico
const db = new sqlite3.Database(DB_PATH);

// Al iniciar, crear tablas si no existen
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'línea Bloom',
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        img TEXT DEFAULT ''
    )`);
    // Seed admin si no hay usuarios
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (row.count === 0) {
            db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [
                'Admin', 'admin@velassesencia.com', 'admin', 'admin'
            ]);
        }
    });
    // Seed productos si está vacío
    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
        if (row.count === 0) {
           const products = [
    [
        'Bloom mediana',
        'Línea Bloom',
        'Vela en envase de vidrio con acabado floral decorativo.',
        16000,
        50,
        "https://image2url.com/r2/default/images/1774500184090-f4e22a54-d1e1-4127-b289-8504aa0c7e0f.png"
    ],
    [
        'Bloom grande',
        'Línea Bloom',
        'Versión con mayor duración.',
        24000,
        30,
        "https://image2url.com/r2/default/images/1774500136789-712ec0b7-e753-4547-9123-44a42a27b881.png"
    ],
    [
        'Set Corazón',
        'Mini Scents',
        '2 velas medianas.',
        15000,
        40,
        "https://image2url.com/r2/default/images/1774539969550-b67adcd9-110f-410c-8837-cbedca573d74.png"
    ],
    [
        'Set Rosas',
        'Mini Scents',
        '4 velas pequeñas. Perfectas para elegir tu aroma favorito.',
        18000,
        40,
        "https://image2url.com/r2/default/images/1774540024937-11d17a21-55a1-4590-914a-be3dc3fe7a04.png"
    ],
    [
        'Terrario',
        'Terrario',
        'Decorada con estilo natural (tipo cactus o jardín). Perfecta como pieza decorativa.',
        30000,
        20,
        "https://image2url.com/r2/default/images/1774456169936-048cc335-e743-44f8-bd9b-7a5895f7a59f.png"
    ],
    [
        'Mascota personalizada',
        'Linea Pet soul',
        'Convierte a tu mascota en un recuerdo único.',
        32000,
        15,
        "https://image2url.com/r2/default/images/1774456213828-a2b210eb-a703-4641-b1f0-5002154caa8c.png"
    ],
    [
        'Mascota en base de barro',
        'Linea Pet soul',
        'Incluye base decorativa.',
        40000,
        10,
        "https://image2url.com/r2/default/images/1774456258303-f585d637-ac43-4298-bb7b-5ddef781e81b.png"
    ]
];

products.forEach(p => {
    db.run("INSERT INTO products (name, category, description, price, stock, img) VALUES (?, ?, ?, ?, ?, ?)", p);
});
        }
    });
});

// --- UTILIDADES ---
function getAll(sql, params = [], cb) {
    db.all(sql, params, (err, rows) => cb(err, rows));
}
function getOne(sql, params = [], cb) {
    db.get(sql, params, (err, row) => cb(err, row));
}

// --- API: PRODUCTOS ---
app.get('/api/products', (req, res) => {
    getAll('SELECT * FROM products ORDER BY id ASC', [], (err, products) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(products);
    });
});

app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock, img } = req.body;
    db.run(
        'INSERT INTO products (name, category, description, price, stock, img) VALUES (?, ?, ?, ?, ?, ?)',
        [name, category || 'línea Bloom', description, price, stock, img || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getOne('SELECT * FROM products WHERE id = ?', [this.lastID], (err, product) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json(product);
            });
        }
    );
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, category, description, price, stock, img } = req.body;
    db.run(
        'UPDATE products SET name=?, category=?, description=?, price=?, stock=?, img=? WHERE id=?',
        [name, category || 'línea Bloom', description, price, stock, img || '', id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getOne('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(product);
            });
        }
    );
});

app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock, img } = req.body;
    db.run(
        'INSERT INTO products (name, category, description, price, stock, img) VALUES (?, ?, ?, ?, ?, ?)',
        [name, category, description, price, stock, img || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, product) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json(product);
            });
        }
    );
});

// --- API: USERS ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    getOne('SELECT id, name, email, role FROM users WHERE email=? AND password=?', [email, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user) res.json(user);
        else res.status(401).json({ error: 'Credenciales inválidas' });
    });
});

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    getOne('SELECT id FROM users WHERE email=?', [email], (err, existing) => {
        if (existing) return res.status(400).json({ error: 'El correo ya existe' });
        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getOne('SELECT id, name, email, role FROM users WHERE id = ?', [this.lastID], (err, user) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json(user);
            });
        });
    });
});

app.get('/api/users/count', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row.count });
    });
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
