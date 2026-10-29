// Precios y ofertas: precio efectivo y porcentaje de descuento.
// El descuento vive en la BD (products.discount_price); si es inválido se ignora.
(function (global) {
    'use strict';

    // Devuelve el descuento válido (0 < descuento < precio) o null.
    function normalizeDiscount(product) {
        const item = product || {};
        const price = Number(item.price);
        if (!Number.isFinite(price) || price <= 0) return null;
        const discount = Number(item.discount_price);
        if (!Number.isFinite(discount) || discount <= 0 || discount >= price) return null;
        return Math.round(discount * 100) / 100;
    }

    function effectivePrice(product) {
        const item = product || {};
        const discount = normalizeDiscount(item);
        if (discount !== null) return discount;
        const price = Number(item.price);
        return Number.isFinite(price) ? price : 0;
    }

    function discountPercent(product) {
        const item = product || {};
        const discount = normalizeDiscount(item);
        const price = Number(item.price);
        if (discount === null || !Number.isFinite(price) || price <= 0) return 0;
        return Math.round((1 - discount / price) * 100);
    }

    function hasDiscount(product) {
        return normalizeDiscount(product) !== null;
    }

    global.Pricing = {
        normalizeDiscount: normalizeDiscount,
        effectivePrice: effectivePrice,
        discountPercent: discountPercent,
        hasDiscount: hasDiscount
    };
})(typeof window !== 'undefined' ? window : globalThis);
