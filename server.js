// =============================================
// Velass&Esencia - Backend API
// Node.js + Express + SQLite
// Includes: auth, products, transactions, orders, cart
// =============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// --- BASE DE DATOS ---
const DB_PATH = path.join(__dirname, 'velassesencia.db');
const db = new sqlite3.Database(DB_PATH);

// Al iniciar, crear tablas si no existen
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        city TEXT DEFAULT ''
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

    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de pedidos
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pendiente',
        total REAL NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        phone TEXT NOT NULL,
        notes TEXT DEFAULT '',
        wompi_transaction_id TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Tabla de items del pedido
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        product_img TEXT DEFAULT '',
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    // Tabla carrito (persistente por usuario)
    db.run(`CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    // Seed admin
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (row && row.count === 0) {
            db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [
                'Stephanie', 'Step.cam.gam97@gmail.com', 'admin', 'admin'
            ]);
        }
    });

    // Seed productos
    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
        if (row && row.count === 0) {
            const products = [
                ['Bloom mediana', 'Línea Bloom', 'Vela en envase de vidrio con acabado floral decorativo.', 16000, 50, 'https://image2url.com/r2/default/images/1774500184090-f4e22a54-d1e1-4127-b289-8504aa0c7e0f.png'],
                ['Bloom grande', 'Línea Bloom', 'Versión con mayor duración.', 25000, 30, 'https://image2url.com/r2/default/images/1774500136789-712ec0b7-e753-4547-9123-44a42a27b881.png'],
                ['Set Corazón', 'Mini Scents', '2 velas medianas.', 15000, 40, 'https://image2url.com/r2/default/images/1774539969550-b67adcd9-110f-410c-8837-cbedca573d74.png'],
                ['Set Rosas', 'Mini Scents', '4 velas pequeñas. Perfectas para elegir tu aroma favorito.', 18000, 40, 'https://image2url.com/r2/default/images/1774540024937-11d17a21-55a1-4590-914a-be3dc3fe7a04.png'],
                ['Terrario', 'Terrario', 'Decorada con estilo natural (tipo cactus o jardín). Perfecta como pieza decorativa.', 30000, 20, 'https://image2url.com/r2/default/images/1774456169936-048cc335-e743-44f8-bd9b-7a5895f7a59f.png'],
                ['Mascota personalizada', 'Linea Pet soul', 'Convierte a tu mascota en un recuerdo único.', 32000, 15, 'https://image2url.com/r2/default/images/1774456213828-a2b210eb-a703-4641-b1f0-5002154caa8c.png'],
                ['Mascota en base de barro', 'Linea Pet soul', 'Incluye base decorativa.', 40000, 10, 'https://image2url.com/r2/default/images/1774456258303-f585d637-ac43-4298-bb7b-5ddef781e81b.png']
            ];
            products.forEach(p => {
                db.run("INSERT INTO products (name, category, description, price, stock, img) VALUES (?, ?, ?, ?, ?, ?)", p);
            });
        }
    });
});

// --- UTILIDADES ---
function getAll(sql, params = [], cb) { db.all(sql, params, (err, rows) => cb(err, rows)); }
function getOne(sql, params = [], cb) { db.get(sql, params, (err, row) => cb(err, row)); }

// =============================================
// API: PRODUCTOS
// =============================================
app.get('/api/products', (req, res) => {
    getAll('SELECT * FROM products ORDER BY id ASC', [], (err, products) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(products);
    });
});

app.post('/api/products', (req, res) => {
    const { name, category, description, price, stock, img } = req.body;
    db.run('INSERT INTO products (name, category, description, price, stock, img) VALUES (?, ?, ?, ?, ?, ?)',
        [name, category || 'línea Bloom', description, price, stock, img || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getOne('SELECT * FROM products WHERE id = ?', [this.lastID], (err, product) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json(product);
            });
        });
});

app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, category, description, price, stock, img } = req.body;
    db.run('UPDATE products SET name=?, category=?, description=?, price=?, stock=?, img=? WHERE id=?',
        [name, category || 'línea Bloom', description, price, stock, img || '', id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getOne('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(product);
            });
        });
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// =============================================
// API: TRANSACCIONES
// =============================================
app.post('/api/transactions', (req, res) => {
    const { type, category, amount, date, description } = req.body;
    db.run('INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)',
        [type, category, amount, date, description || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getOne('SELECT * FROM transactions WHERE id = ?', [this.lastID], (err, t) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json(t);
            });
        });
});

app.get('/api/transactions', (req, res) => {
    getAll('SELECT * FROM transactions ORDER BY date DESC, created_at DESC', [], (err, t) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(t);
    });
});

app.get('/api/transactions/:month', (req, res) => {
    const { month } = req.params;
    getAll('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC', [`${month}%`], (err, t) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(t);
    });
});

app.delete('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM transactions WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// =============================================
// API: USUARIOS
// =============================================
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    getOne('SELECT id, name, email, role, phone, address, city FROM users WHERE email=? AND password=?',
        [email, password],
        (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            if (user) res.json(user);
            else res.status(401).json({ error: 'Credenciales inválidas' });
        });
});

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    getOne('SELECT id FROM users WHERE email=?', [email], (err, existing) => {
        if (existing) return res.status(400).json({ error: 'El correo ya existe' });
        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, password],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                getOne('SELECT id, name, email, role, phone, address, city FROM users WHERE id = ?',
                    [this.lastID],
                    (err, user) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.status(201).json(user);
                    });
            });
    });
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, phone, address, city } = req.body;
    db.run('UPDATE users SET name=?, phone=?, address=?, city=? WHERE id=?',
        [name, phone || '', address || '', city || '', id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            getOne('SELECT id, name, email, role, phone, address, city FROM users WHERE id = ?',
                [id],
                (err, user) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(user);
                });
        });
});

app.get('/api/users/count', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row.count });
    });
});

// =============================================
// API: CARRITO
// =============================================

// Obtener carrito del usuario
app.get('/api/cart/:userId', (req, res) => {
    const { userId } = req.params;
    const sql = `
        SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.img, p.stock, p.category
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
    `;
    getAll(sql, [userId], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(items);
    });
});

// Agregar o actualizar item en carrito
app.post('/api/cart', (req, res) => {
    const { user_id, product_id, quantity } = req.body;
    db.run(`INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)
            ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + ?`,
        [user_id, product_id, quantity || 1, quantity || 1],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

// Actualizar cantidad
app.put('/api/cart/:userId/:productId', (req, res) => {
    const { userId, productId } = req.params;
    const { quantity } = req.body;
    if (quantity <= 0) {
        db.run('DELETE FROM cart WHERE user_id=? AND product_id=?', [userId, productId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, deleted: true });
        });
    } else {
        db.run('UPDATE cart SET quantity=? WHERE user_id=? AND product_id=?',
            [quantity, userId, productId],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
    }
});

// Eliminar item del carrito
app.delete('/api/cart/:userId/:productId', (req, res) => {
    const { userId, productId } = req.params;
    db.run('DELETE FROM cart WHERE user_id=? AND product_id=?', [userId, productId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Vaciar carrito
app.delete('/api/cart/:userId', (req, res) => {
    const { userId } = req.params;
    db.run('DELETE FROM cart WHERE user_id=?', [userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// =============================================
// API: PEDIDOS
// =============================================

// Crear pedido
app.post('/api/orders', (req, res) => {
    const { user_id, items, address, city, phone, notes, total } = req.body;

    if (!user_id || !items || items.length === 0 || !address || !city || !phone) {
        return res.status(400).json({ error: 'Datos del pedido incompletos' });
    }

    db.run(`INSERT INTO orders (user_id, total, address, city, phone, notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, total, address, city, phone, notes || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const orderId = this.lastID;
            const stmt = db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, product_img, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)`);
            items.forEach(item => {
                stmt.run([orderId, item.product_id, item.name, item.img || '', item.quantity, item.price]);
                // Descontar stock
                db.run('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [item.quantity, item.product_id]);
            });
            stmt.finalize();

            // Vaciar carrito del usuario
            db.run('DELETE FROM cart WHERE user_id=?', [user_id]);

            res.status(201).json({ success: true, order_id: orderId });
        });
});

// Obtener pedidos de un usuario
app.get('/api/orders/user/:userId', (req, res) => {
    const { userId } = req.params;
    getAll('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [userId], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });

        // Para cada orden, obtener sus items
        let pending = orders.length;
        if (pending === 0) return res.json([]);

        orders.forEach((order, i) => {
            getAll('SELECT * FROM order_items WHERE order_id=?', [order.id], (err, items) => {
                orders[i].items = items || [];
                pending--;
                if (pending === 0) res.json(orders);
            });
        });
    });
});

// Obtener todos los pedidos (admin)
app.get('/api/orders', (req, res) => {
    const sql = `
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    `;
    getAll(sql, [], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });

        let pending = orders.length;
        if (pending === 0) return res.json([]);

        orders.forEach((order, i) => {
            getAll('SELECT * FROM order_items WHERE order_id=?', [order.id], (err, items) => {
                orders[i].items = items || [];
                pending--;
                if (pending === 0) res.json(orders);
            });
        });
    });
});

// Actualizar estado de pedido (admin)
app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.run('UPDATE orders SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [status, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

// =============================================
// WOMPI WEBHOOK
// Cuando Wompi confirma un pago, actualiza el pedido
// =============================================
app.post('/api/wompi/webhook', (req, res) => {
    const event = req.body;

    // Verificar que sea un evento de transacción aprobada
    if (event && event.event === 'transaction.updated') {
        const transaction = event.data && event.data.transaction;
        if (transaction && transaction.status === 'APPROVED') {
            const ref = transaction.reference; // Usamos referencia = order_id
            const wompiId = transaction.id;

            // Actualizar pedido a "pagado"
            db.run(`UPDATE orders SET status='pagado', wompi_transaction_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
                [wompiId, ref],
                (err) => {
                    if (err) console.error('Error actualizando pedido desde Wompi:', err.message);
                });
        }
    }

    res.status(200).json({ received: true });
});

// =============================================
// STATIC FILES & FALLBACK
// =============================================
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
