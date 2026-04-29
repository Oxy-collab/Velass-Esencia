// =============================================
// Velass&Esencia - Backend API (Optimized for Render)
// =============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3'); // Cambio a better-sqlite3
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const DB_PATH = path.join(__dirname, 'velassesencia.db');
const db = new Database(DB_PATH); // Conexión síncrona y más estable

// Inicialización de tablas
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        city TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'línea Bloom',
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        img TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pendiente',
        total REAL NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        phone TEXT NOT NULL,
        notes TEXT DEFAULT '',
        wompi_transaction_id TEXT DEFAULT '',
        wompi_reference TEXT DEFAULT '',
        payment_status TEXT DEFAULT 'pendiente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        product_img TEXT DEFAULT '',
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
`);

// Datos iniciales (Seeders)
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
    db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)")
      .run('Stephanie', 'Step.cam.gam97@gmail.com', 'admin', 'admin');
}

const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
if (productCount === 0) {
    const products = [
        ['Bloom mediana','Línea Bloom','Vela en envase de vidrio con acabado floral decorativo.',16000,50,"https://image2url.com/r2/default/images/1774500184090-f4e22a54-d1e1-4127-b289-8504aa0c7e0f.png"],
        ['Bloom grande','Línea Bloom','Versión con mayor duración.',25000,30,"https://image2url.com/r2/default/images/1774500136789-712ec0b7-e753-4547-9123-44a42a27b881.png"],
        ['Set Corazón','Mini Scents','2 velas medianas.',15000,40,"https://image2url.com/r2/default/images/1774539969550-b67adcd9-110f-410c-8837-cbedca573d74.png"],
        ['Set Rosas','Mini Scents','4 velas pequeñas. Perfectas para elegir tu aroma favorito.',18000,40,"https://image2url.com/r2/default/images/1774540024937-11d17a21-55a1-4590-914a-be3dc3fe7a04.png"],
        ['Terrario','Terrario','Decorada con estilo natural (tipo cactus o jardín). Perfecta como pieza decorativa.',30000,20,"https://image2url.com/r2/default/images/1774456169936-048cc335-e743-44f8-bd9b-7a5895f7a59f.png"],
        ['Mascota personalizada','Linea Pet soul','Convierte a tu mascota en un recuerdo único.',32000,15,"https://image2url.com/r2/default/images/1774456213828-a2b210eb-a703-4641-b1f0-5002154caa8c.png"],
        ['Mascota en base de barro','Linea Pet soul','Incluye base decorativa.',40000,10,"https://image2url.com/r2/default/images/1774456258303-f585d637-ac43-4298-bb7b-5ddef781e81b.png"]
    ];
    const insertProd = db.prepare("INSERT INTO products (name, category, description, price, stock, img) VALUES (?, ?, ?, ?, ?, ?)");
    products.forEach(p => insertProd.run(p));
}

function generateReference() {
    return 'VE-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// --- ENDPOINTS PRODUCTOS ---
app.get('/api/products', (req, res) => {
    try {
        const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock, img } = req.body;
    try {
        const info = db.prepare('INSERT INTO products (name, category, description, price, stock, img) VALUES (?, ?, ?, ?, ?, ?)')
            .run(name, category || 'línea Bloom', description, price, stock, img || '');
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
        res.status(201).json(product);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ENDPOINTS USUARIOS ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    try {
        const user = db.prepare('SELECT id, name, email, role, phone, address, city FROM users WHERE email=? AND password=?').get(email, password);
        if (user) res.json(user);
        else res.status(401).json({ error: 'Credenciales inválidas' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ENDPOINTS ÓRDENES ---
app.post('/api/orders', (req, res) => {
    const { user_id, items, address, city, phone, notes, total } = req.body;
    if (!user_id || !items?.length || !address || !city || !phone || !total)
        return res.status(400).json({ error: 'Datos de orden incompletos' });

    const reference = generateReference();
    
    const transaction = db.transaction(() => {
        const info = db.prepare('INSERT INTO orders (user_id, total, address, city, phone, notes, wompi_reference) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(user_id, total, address, city, phone, notes || '', reference);
        
        const orderId = info.lastInsertRowid;
        const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, product_img, quantity, price) VALUES (?, ?, ?, ?, ?, ?)');
        
        for (const item of items) {
            insertItem.run(orderId, item.id, item.name, item.img || '', item.quantity, item.price);
        }
        return orderId;
    });

    try {
        const orderId = transaction();
        res.status(201).json({ id: orderId, reference, total, status: 'pendiente' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Configuración de archivos estáticos (IMPORTANTE EL ORDEN)
app.use(express.static(path.join(__dirname)));

// Esta ruta DEBE ir al final para manejar el ruteo de SPAs (Single Page Apps)
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor Velass&Esencia en puerto ${PORT}`));
