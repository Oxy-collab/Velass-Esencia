#!/usr/bin/env node
// Crea o actualiza el usuario administrador a partir de variables de entorno.
//
// Uso:
//   ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD='una-clave-larga' DATABASE_URL=... npm run create-admin
//
// Si el usuario ya existe, actualiza la contraseña y fuerza el cierre de sus
// sesiones (session_version + 1).

const { Pool } = require('pg');

const email = process.env.ADMIN_EMAIL || process.argv[2];
const password = process.env.ADMIN_PASSWORD || process.argv[3];
const name = process.env.ADMIN_NAME || 'Admin';

if (!email || !password) {
    console.error('Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... DATABASE_URL=... npm run create-admin');
    process.exit(1);
}
if (String(password).length < 8) {
    console.error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
        ? false
        : { rejectUnauthorized: false }
});

(async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
    )`);
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0');

    const result = await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'admin')
         ON CONFLICT (email) DO UPDATE
            SET password = EXCLUDED.password,
                role = 'admin',
                session_version = users.session_version + 1
         RETURNING id, name, email, role`,
        [name, email, password]
    );

    console.log('✅ Admin listo:', result.rows[0].email, '| rol:', result.rows[0].role);
    await pool.end();
})().catch(async (err) => {
    console.error('❌ Error creando el admin:', err.message);
    try { await pool.end(); } catch (e) { /* ignora */ }
    process.exit(1);
});
