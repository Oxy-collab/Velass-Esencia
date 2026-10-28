// Hash y verificación de contraseñas.
// bcryptjs es JS puro: no requiere compilación nativa (funciona igual en Render y en local).
const bcrypt = require('bcryptjs');

const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

const hashPassword = (plainPassword) => bcrypt.hash(String(plainPassword), ROUNDS);

const verifyPassword = (plainPassword, hash) => {
    if (!hash) return Promise.resolve(false);
    return bcrypt.compare(String(plainPassword), String(hash)).catch(() => false);
};

// Migra las contraseñas que quedaron en texto plano (columna `password`) a bcrypt.
// Deja `password` como cadena vacía para no almacenar el secreto original.
// Es idempotente: solo toca filas sin `password_hash`.
const migrateLegacyPasswords = async (pool) => {
    const legacy = await pool.query(
        "SELECT id, password FROM users WHERE password_hash IS NULL AND password IS NOT NULL AND password <> ''"
    );
    for (const row of legacy.rows) {
        const hash = await hashPassword(row.password);
        await pool.query("UPDATE users SET password_hash=$1, password='' WHERE id=$2", [hash, row.id]);
    }
    return legacy.rows.length;
};

module.exports = { hashPassword, verifyPassword, migrateLegacyPasswords, ROUNDS };
