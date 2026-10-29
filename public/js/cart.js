// Carrito de compras: lógica pura (sin DOM) para poder testearla.
// La persistencia se inyecta (localStorage en el navegador) para no depender de él aquí.
(function (global) {
    'use strict';

    const STORAGE_KEY = 'ves_cart_v1';
    const MAX_QTY = 99;

    function formatPrice(amount) {
        const value = Number(amount) || 0;
        if (global.WhatsApp && typeof global.WhatsApp.formatCOP === 'function') {
            return global.WhatsApp.formatCOP(value);
        }
        return '$' + value.toLocaleString('es-CO');
    }

    function sanitizeItem(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const id = Number(raw.id);
        const price = Number(raw.price);
        const name = String(raw.name || '').trim();
        const qty = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(raw.qty) || 0)));
        if (!Number.isFinite(id) || id <= 0 || !name || !Number.isFinite(price) || price < 0) return null;
        return {
            id: id,
            name: name,
            price: price,
            qty: qty,
            category: String(raw.category || ''),
            img: String(raw.img || '')
        };
    }

    function load(storage) {
        try {
            const raw = storage ? storage.getItem(STORAGE_KEY) : null;
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(sanitizeItem).filter(Boolean);
        } catch (e) {
            return [];
        }
    }

    function save(storage, items) {
        try {
            if (!storage) return;
            const clean = (Array.isArray(items) ? items : []).map(sanitizeItem).filter(Boolean);
            storage.setItem(STORAGE_KEY, JSON.stringify(clean));
        } catch (e) { /* modo privado o cuota llena */ }
    }

    function addItem(items, product, qty) {
        const list = (Array.isArray(items) ? items : []).slice();
        const item = sanitizeItem(Object.assign({}, product || {}, { qty: qty || 1 }));
        if (!item) return list;
        const existing = list.find((entry) => entry.id === item.id);
        if (existing) {
            existing.qty = Math.min(MAX_QTY, existing.qty + item.qty);
        } else {
            list.push(item);
        }
        return list;
    }

    function removeItem(items, id) {
        return (Array.isArray(items) ? items : []).filter((entry) => entry.id !== Number(id));
    }

    function setQty(items, id, qty) {
        const nextQty = Math.floor(Number(qty));
        return (Array.isArray(items) ? items : []).map((entry) => {
            if (entry.id !== Number(id)) return entry;
            if (!Number.isFinite(nextQty)) return entry;
            if (nextQty < 1) return Object.assign({}, entry, { qty: 1 });
            return Object.assign({}, entry, { qty: Math.min(MAX_QTY, nextQty) });
        });
    }

    function count(items) {
        return (Array.isArray(items) ? items : []).reduce((sum, entry) => sum + entry.qty, 0);
    }

    function subtotal(items) {
        return (Array.isArray(items) ? items : []).reduce((sum, entry) => sum + (entry.price * entry.qty), 0);
    }

    function buildMessage(items) {
        const list = (Array.isArray(items) ? items : []).filter(Boolean);
        if (list.length === 0) return '';
        const lines = ['Hola! Quiero hacer este pedido:'];
        list.forEach((item) => {
            lines.push('- ' + item.qty + '× ' + item.name + ' — ' + formatPrice(item.price * item.qty));
        });
        lines.push('Total: ' + formatPrice(subtotal(list)));
        lines.push('');
        lines.push('Mi dirección de envío es: ');
        return lines.join('\n');
    }

    global.Cart = {
        STORAGE_KEY: STORAGE_KEY,
        MAX_QTY: MAX_QTY,
        sanitizeItem: sanitizeItem,
        load: load,
        save: save,
        addItem: addItem,
        removeItem: removeItem,
        setQty: setQty,
        count: count,
        subtotal: subtotal,
        buildMessage: buildMessage
    };
})(typeof window !== 'undefined' ? window : globalThis);
