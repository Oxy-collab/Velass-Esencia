// Test unitario para validación y endpoints de materias primas (UX-5)
const assert = require('assert');
const { rawMaterialSchema, rawMaterialBulkSchema, idSchema } = require('../lib/validation');

console.log('--- Probando esquemas de validación de materias primas ---');

// 1. Caso válido con datos normales
const valid1 = rawMaterialSchema.parse({
    name: 'Cera de Soja Bajo Punto de Fusión',
    category: 'Cera',
    qty: 50,
    unit: 'kg',
    min_qty: 10,
    cost: 32000,
    notes: 'Proveedor Nacional'
});
assert.strictEqual(valid1.name, 'Cera de Soja Bajo Punto de Fusión');
assert.strictEqual(valid1.qty, 50);
assert.strictEqual(valid1.min_qty, 10);
assert.strictEqual(valid1.cost, 32000);
console.log('✅ Esquema individual válido');

// 2. Normalización de minQty en camelCase (compatibilidad con localStorage)
const validCamel = rawMaterialSchema.parse({
    name: 'Esencia Vainilla Francesa',
    category: 'Esencias',
    qty: 250,
    unit: 'ml',
    minQty: 50,
    cost: 15000
});
assert.strictEqual(validCamel.min_qty, 50);
console.log('✅ Normalización de minQty camelCase a min_qty snake_case exitosa');

// 3. Validación de errores (nombre vacío, cantidad negativa)
assert.throws(() => {
    rawMaterialSchema.parse({
        name: '',
        category: 'Cera',
        qty: -5,
        unit: 'kg'
    });
}, /El nombre es obligatorio/);
console.log('✅ Rechazo de datos inválidos (nombre vacío o números negativos)');

// 4. Lote de migración (bulk)
const bulk = rawMaterialBulkSchema.parse({
    materials: [
        { name: 'Mechas de algodón #2', category: 'Mechas', qty: 100, unit: 'unidades', minQty: 20 },
        { name: 'Colorante magenta', category: 'Colorantes', qty: 50, unit: 'g', min_qty: 10 }
    ]
});
assert.strictEqual(bulk.materials.length, 2);
assert.strictEqual(bulk.materials[0].min_qty, 20);
assert.strictEqual(bulk.materials[1].min_qty, 10);
console.log('✅ Esquema de migración en lote (bulk) exitoso');

// 5. Validación de ID de ruta
assert.strictEqual(idSchema.parse('42'), 42);
assert.throws(() => idSchema.parse('-1'));
assert.throws(() => idSchema.parse('abc'));
console.log('✅ Validación de ID de ruta paramétrica correcta');

console.log('🎉 TODOS LOS TESTS DE VALIDACIÓN DE API PASARON SATISFACTORIAMENTE');

