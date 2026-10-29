// Slugs de producto: generación, unicidad y backfill de productos existentes.
const slugify = (value) => {
    const base = String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    return base || 'producto';
};

const ensureUniqueSlug = async (pool, value, excludeId) => {
    const base = slugify(value);
    let candidate = base;
    let suffix = 1;
    while (suffix < 500) {
        const params = [candidate];
        let sql = 'SELECT id FROM products WHERE slug=$1';
        if (excludeId) {
            sql += ' AND id<>$2';
            params.push(excludeId);
        }
        const result = await pool.query(sql, params);
        if (!result.rows[0]) return candidate;
        suffix += 1;
        candidate = `${base.slice(0, 55)}-${suffix}`;
    }
    return `${base.slice(0, 50)}-${Date.now()}`;
};

// Rellena el slug de los productos que aún no lo tienen (bases ya existentes).
const backfillSlugs = async (pool) => {
    const pending = await pool.query("SELECT id, name FROM products WHERE slug IS NULL OR slug = '' ORDER BY id");
    let updated = 0;
    for (const row of pending.rows) {
        const slug = await ensureUniqueSlug(pool, row.name, row.id);
        await pool.query('UPDATE products SET slug=$1 WHERE id=$2', [slug, row.id]);
        updated += 1;
    }
    return updated;
};

module.exports = { slugify, ensureUniqueSlug, backfillSlugs };
