// Renderizado de páginas públicas (producto y 404) y ficheros SEO.
// Todo se genera en servidor: HTML crawlable, sin depender de JS.

const escapeHtml = (value) => String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeXml = (value) => escapeHtml(value).replace(/&#39;/g, '&apos;');

const formatCOP = (amount) => {
    try {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(amount) || 0);
    } catch (e) {
        return '$' + (Number(amount) || 0).toLocaleString('es-CO');
    }
};

// Devuelve el descuento válido (0 < descuento < precio) o null.
const validDiscount = (product) => {
    const price = Number(product && product.price);
    const discount = Number(product && product.discount_price);
    if (!Number.isFinite(price) || price <= 0) return null;
    if (!Number.isFinite(discount) || discount <= 0 || discount >= price) return null;
    return Math.round(discount * 100) / 100;
};

const effectivePrice = (product) => {
    const discount = validDiscount(product);
    return discount === null ? Number(product && product.price) || 0 : discount;
};

const discountPercent = (product) => {
    const discount = validDiscount(product);
    const price = Number(product && product.price);
    if (discount === null || !Number.isFinite(price) || price <= 0) return 0;
    return Math.round((1 - discount / price) * 100);
};

const pageShell = ({ title, description, canonical, image, body, extraHead }) => `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta name="robots" content="index,follow">
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="Velass&amp;Esencia">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ''}
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
    <link rel="stylesheet" href="/css/styles.css">
    ${extraHead || ''}
</head>
<body>
${body}
</body>
</html>`;

const renderProductPage = ({ product, baseUrl, whatsappNumber, reviews }) => {
    const name = String(product.name || 'Vela');
    const description = String(product.description || '').replace(/\s+/g, ' ').trim() || `Vela artesanal ${name} de Velass&Esencia.`;
    const url = `${baseUrl}/producto/${encodeURIComponent(product.slug)}`;
    const image = /^https?:\/\//i.test(String(product.img || '')) ? String(product.img) : '';
    const price = Number(product.price) || 0;
    const discount = validDiscount(product);
    const finalPrice = discount === null ? price : discount;
    const percent = discountPercent(product);
    const inStock = Number(product.stock) > 0;

    // Especificaciones que ayudan a decidir la compra
    const specs = [];
    const addSpec = (label, value, unit) => {
        if (value === null || value === undefined || value === '') return;
        specs.push({ label: label, value: unit ? `${value} ${unit}` : String(value) });
    };
    addSpec('Peso', product.weight_g, 'g');
    addSpec('Duración aproximada', product.burn_hours, 'h');
    addSpec('Cera', product.wax_type);
    addSpec('Mecha', product.wick_type);
    addSpec('Notas olfativas', product.scent_notes);
    const care = String(product.care_instructions || '').trim();

    const reviewList = Array.isArray(reviews) ? reviews.filter((review) => review && Number(review.rating) >= 1) : [];
    const averageRating = reviewList.length
        ? Math.round((reviewList.reduce((sum, review) => sum + Number(review.rating), 0) / reviewList.length) * 10) / 10
        : null;

    const waMessage = `Hola! Quiero la vela "${name}".\nPrecio: ${formatCOP(finalPrice)}\nMi dirección de envío es: `;
    const waUrl = `https://wa.me/${String(whatsappNumber).replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: name,
        description: description,
        sku: String(product.id),
        category: String(product.category || ''),
        brand: { '@type': 'Brand', name: 'Velass&Esencia' },
        image: image ? [image] : undefined,
        offers: {
            '@type': 'Offer',
            url: url,
            priceCurrency: 'COP',
            price: String(Math.round(finalPrice)),
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition'
        },
        additionalProperty: specs.length
            ? specs.map((spec) => ({ '@type': 'PropertyValue', name: spec.label, value: spec.value }))
            : undefined,
        aggregateRating: averageRating !== null
            ? { '@type': 'AggregateRating', ratingValue: String(averageRating), reviewCount: String(reviewList.length) }
            : undefined,
        review: reviewList.length
            ? reviewList.map((review) => ({
                '@type': 'Review',
                author: { '@type': 'Person', name: String(review.author) },
                reviewRating: { '@type': 'Rating', ratingValue: String(review.rating), bestRating: '5' },
                reviewBody: String(review.comment)
            }))
            : undefined
    };
    const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`;

    const priceHtml = discount === null
        ? `<span class="product-page-price">${escapeHtml(formatCOP(finalPrice))}</span>`
        : `<span class="product-page-old-price">${escapeHtml(formatCOP(price))}</span>
           <span class="product-page-price">${escapeHtml(formatCOP(finalPrice))}</span>
           <span class="product-page-discount">-${percent}% OFF</span>`;

    const specsHtml = specs.length
        ? `<dl class="product-page-specs">${specs.map((spec) => `<div><dt>${escapeHtml(spec.label)}</dt><dd>${escapeHtml(spec.value)}</dd></div>`).join('')}</dl>`
        : '';
    const careHtml = care
        ? `<section class="product-page-care"><h2>Cuidados</h2><p>${escapeHtml(care)}</p></section>`
        : '';
    const reviewsHtml = reviewList.length
        ? `<section class="product-page-reviews" id="opiniones">
        <h2>Opiniones (${reviewList.length})</h2>
        <p class="product-page-rating">${'★'.repeat(Math.round(averageRating))}${'☆'.repeat(5 - Math.round(averageRating))} ${averageRating.toFixed(1)} / 5</p>
        <ul>${reviewList.map((review) => `<li>
            <p class="review-author"><strong>${escapeHtml(review.author)}</strong> <span class="review-stars">${'★'.repeat(Number(review.rating))}</span></p>
            <p>${escapeHtml(review.comment)}</p>
        </li>`).join('')}</ul>
    </section>`
        : '';

    const body = `
<header class="product-page-header">
    <a href="/" class="product-page-logo">Velass&amp;Esencia</a>
    <nav>
        <a href="/">Catálogo</a>
        <a href="/#candle-test">Descubre tu vela</a>
    </nav>
</header>
<main class="product-page">
    ${image ? `<img class="product-page-img" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" width="600" height="600" loading="eager">` : ''}
    <div class="product-page-info">
        <p class="product-page-category">${escapeHtml(product.category || '')}</p>
        <h1>${escapeHtml(name)}</h1>
        <p class="product-page-price-row">${priceHtml}</p>
        <p class="product-page-description">${escapeHtml(description)}</p>
        ${specsHtml}
        <p class="product-page-stock">${inStock ? 'Disponible' : 'Agotado por el momento'}</p>
        <a class="btn primary-btn product-page-cta" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer">Pedir por WhatsApp</a>
        <a class="product-page-back" href="/">← Volver al catálogo</a>
    </div>
</main>
${careHtml}
${reviewsHtml}
<footer class="product-page-footer">
    <p>&copy; 2026 Velass&amp;Esencia. Hechas a mano, pensadas para iluminar tus momentos.</p>
</footer>
${jsonLdScript}`;

    return pageShell({ title: `${name} — Velass&Esencia`, description: description.slice(0, 155), canonical: url, image, body, extraHead: '' });
};

const renderNotFound = (baseUrl) => pageShell({
    title: 'Página no encontrada — Velass&Esencia',
    description: 'La página que buscas no existe.',
    canonical: `${baseUrl}/`,
    image: '',
    body: `
<main class="error-page">
    <h1>404</h1>
    <p>No encontramos esa página. Puede que el producto ya no esté disponible.</p>
    <a class="btn primary-btn" href="/">Volver al catálogo</a>
</main>`
});

const buildSitemap = (products, baseUrl) => {
    const urls = [`${baseUrl}/`, `${baseUrl}/login.html`]
        .concat((products || []).filter((p) => p.slug).map((p) => `${baseUrl}/producto/${encodeURIComponent(p.slug)}`));
    const entries = urls.map((url) => `    <url><loc>${escapeXml(url)}</loc></url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
};

const buildRobots = (baseUrl) => [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin.html',
    'Disallow: /api/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    ''
].join('\n');

module.exports = {
    escapeHtml,
    formatCOP,
    effectivePrice,
    discountPercent,
    validDiscount,
    renderProductPage,
    renderNotFound,
    buildSitemap,
    buildRobots
};
