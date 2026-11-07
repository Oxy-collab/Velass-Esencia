// Test de endpoints HTTP de Fase 2
const http = require('http');
const assert = require('assert');

// Verificamos que el servidor cargue e inicialice sus rutas
process.env.SESSION_SECRET = 'test-secret-phase2-at-least-32-chars-long';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://mock:mock@localhost:5432/mock';
// No inicializar la conexión real a PG durante el arranque de test rápido
const app = require('../server');

const server = http.createServer(app);

server.listen(0, async () => {
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;

    const request = (path, options = {}) => new Promise((resolve, reject) => {
        const req = http.request(base + path, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });

    try {
        console.log('--- Verificando endpoints y estáticos de Fase 2 ---');

        // 1. Estáticos de Fase 2
        const resTheme = await request('/js/theme-init.js');
        assert.strictEqual(resTheme.status, 200, '/js/theme-init.js debe responder 200');
        assert(resTheme.body.includes('data-theme'), '/js/theme-init.js debe contener script de tema');
        console.log('✅ GET /js/theme-init.js -> 200');

        const resToast = await request('/js/toast.js');
        assert.strictEqual(resToast.status, 200, '/js/toast.js debe responder 200');
        assert(resToast.body.includes('Toast'), '/js/toast.js debe contener sistema de notificaciones');
        console.log('✅ GET /js/toast.js -> 200');

        const resPlaceholder = await request('/images/candle-placeholder.svg');
        assert.strictEqual(resPlaceholder.status, 200, '/images/candle-placeholder.svg debe responder 200');
        assert(resPlaceholder.body.includes('<svg'), '/images/candle-placeholder.svg debe ser un SVG');
        console.log('✅ GET /images/candle-placeholder.svg -> 200');

        // 2. Rutas protegidas de materias primas sin sesión (deben responder 401)
        const resGetMat = await request('/api/raw-materials');
        assert.strictEqual(resGetMat.status, 401, 'GET /api/raw-materials sin auth debe ser 401');
        console.log('✅ GET /api/raw-materials sin auth -> 401');

        const resPostMat = await request('/api/raw-materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test', category: 'Cera', qty: 10, unit: 'kg' })
        });
        assert.strictEqual(resPostMat.status, 401, 'POST /api/raw-materials sin auth debe ser 401');
        console.log('✅ POST /api/raw-materials sin auth -> 401');

        const resPutMat = await request('/api/raw-materials/1', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test', category: 'Cera', qty: 10, unit: 'kg' })
        });
        assert.strictEqual(resPutMat.status, 401, 'PUT /api/raw-materials/1 sin auth debe ser 401');
        console.log('✅ PUT /api/raw-materials/1 sin auth -> 401');

        const resDelMat = await request('/api/raw-materials/1', { method: 'DELETE' });
        assert.strictEqual(resDelMat.status, 401, 'DELETE /api/raw-materials/1 sin auth debe ser 401');
        console.log('✅ DELETE /api/raw-materials/1 sin auth -> 401');

        // 3. Portada HTML verifica que se inyectó el tema sin flash y el skip link
        const resIndex = await request('/');
        assert.strictEqual(resIndex.status, 200, 'GET / debe responder 200');
        assert(resIndex.body.includes('skip-link'), 'Portada debe contener skip-link');
        assert(resIndex.body.includes('js/theme-init.js'), 'Portada debe enlazar theme-init.js');
        assert(!resIndex.body.includes('liquid-galss'), 'Portada no debe tener typo');
        assert(resIndex.body.includes('id="product-detail-modal"'), 'Portada debe incluir modal');
        console.log('✅ GET / -> 200 con accesibilidad, tema y modal integrados');

        console.log('🎉 TODOS LOS ENDPOINTS DE FASE 2 VERIFICADOS CORRECTAMENTE');
    } catch (err) {
        console.error('❌ Error durante la verificación de endpoints:', err);
        process.exitCode = 1;
    } finally {
        server.close();
        process.exit(process.exitCode || 0);
    }
});

