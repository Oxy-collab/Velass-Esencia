// Utilidades de WhatsApp: normalización del número y construcción de mensajes.
// Se usa tanto en la tienda como en el panel de administración.
(function (global) {
    'use strict';

    const DEFAULT_NUMBER = '573005798487';

    function normalizeWhatsAppNumber(value) {
        if (value === null || value === undefined) return null;
        let digits = String(value).replace(/[^\d]/g, '');
        if (digits.startsWith('00')) digits = digits.slice(2);
        if (digits.length < 10 || digits.length > 15) return null;
        return digits;
    }

    function formatCOP(amount) {
        try {
            return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
        } catch (e) {
            return '$' + Number(amount).toLocaleString('es-CO');
        }
    }

    function buildProductMessage(product) {
        const item = product || {};
        const lines = ['Hola! Quiero la vela "' + String(item.name || '').trim() + '".'];
        if (item.category) lines.push('Categoría: ' + String(item.category));
        const price = Number(item.price);
        if (Number.isFinite(price)) lines.push('Precio: ' + formatCOP(price));
        lines.push('Mi dirección de envío es: ');
        return lines.join('\n');
    }

    function buildCustomMessage(config) {
        const options = config || {};
        return 'Hola! Quiero pedir una vela personalizada:\n' +
            '- Olor: ' + String(options.scent || '') + '\n' +
            '- Color: ' + String(options.color || '') + '\n' +
            '- Figura/Raza: ' + String(options.shape || '') + '\n\n' +
            'Mi dirección de envío es: ';
    }

    function buildGeneralMessage() {
        return 'Hola! Quiero información sobre las velas de Velass&Esencia.';
    }

    function buildWhatsAppUrl(number, message) {
        const normalized = normalizeWhatsAppNumber(number);
        if (!normalized) return null;
        return 'https://wa.me/' + normalized + '?text=' + encodeURIComponent(String(message || ''));
    }

    global.WhatsApp = {
        DEFAULT_NUMBER: DEFAULT_NUMBER,
        normalizeWhatsAppNumber: normalizeWhatsAppNumber,
        formatCOP: formatCOP,
        buildProductMessage: buildProductMessage,
        buildCustomMessage: buildCustomMessage,
        buildGeneralMessage: buildGeneralMessage,
        buildWhatsAppUrl: buildWhatsAppUrl
    };
})(typeof window !== 'undefined' ? window : globalThis);
