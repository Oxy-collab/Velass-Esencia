// =============================================
// Velass&Esencia - Frontend Application
// Connects to backend API for persistent data
// =============================================

const API_BASE = '';  // Same origin, no prefix needed

// Normalize categories (map variants to canonical labels)
function normalizeCategory(cat) {
    if (!cat) return 'Línea Bloom';
    const c = String(cat).trim();
    const lower = c.toLowerCase();
    // Match common typos and variants
    if (lower.includes('bloom') || lower.includes('boom') || lower.includes('línea bloom') || lower.includes('linea bloom') || lower.includes('linea boom')) {
        return 'Línea Bloom';
    }
    return c;
}

// Core System
const AppSystem = {
    async init() {
        this.checkAuth();
        this.setupNavigation();
    },

    async getProducts() {
        try {
            const res = await fetch(`${API_BASE}/api/products`);
            if (!res.ok) throw new Error('Error cargando productos');
            return await res.json();
        } catch (err) {
            console.error('Error fetching products:', err);
            return [];
        }
    },

    async getUsersCount() {
        try {
            const res = await fetch(`${API_BASE}/api/users/count`);
            if (!res.ok) return { count: 0 };
            return await res.json();
        } catch (err) {
            return { count: 0 };
        }
    },

    checkAuth() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const navLogin = document.getElementById('nav-login');
        const navLogout = document.getElementById('nav-logout');
        const navAdmin = document.getElementById('nav-admin');

        if (currentUser) {
            if (navLogin) navLogin.style.display = 'none';
            if (navLogout) navLogout.style.display = 'inline';
            if (currentUser.role === 'admin' && navAdmin) {
                navAdmin.style.display = 'inline';
            }
        }
    },

    setupNavigation() {
        const logoutBtn = document.getElementById('nav-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }
    }
};

// Catalog Page System
const CatalogSystem = {
    async init() {
        if (document.getElementById('catalog-section')) {
            await this.renderProducts();
        }
    },

    async renderProducts() {
        const container = document.getElementById('catalog-container');
        if (!container) return;

        const products = await AppSystem.getProducts();
        container.innerHTML = '';
        const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

        const grouped = products.reduce((acc, p) => {
            const cat = normalizeCategory(p.category || '');
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
        }, {});

        // Maintain category order (use canonical name)
        const categoryOrder = ['Línea Bloom', 'Mini Scents', 'Terrario', 'Linea Pet soul'];
        const sortedCategories = Object.keys(grouped).sort((a, b) => {
            const ia = categoryOrder.indexOf(a);
            const ib = categoryOrder.indexOf(b);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });

        for (const category of sortedCategories) {
            const items = grouped[category];
            const section = document.createElement('div');
            section.className = 'category-section';

            const title = document.createElement('h3');
            title.className = 'category-title';
            title.textContent = category;
            section.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'product-grid';

            items.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card';
                const imgUrl = p.img || 'https://via.placeholder.com/400x300?text=Imagen+Pendiente';

                card.innerHTML = `
            <div class="product-img" style="background-image: url('${imgUrl}')"></div>
            <div class="product-info">
            <h3 class="product-title">${p.name}</h3>
            <p class="product-desc">${p.description}</p>
            <div class="product-footer">
            <span class="product-price">${formatter.format(p.price)}</span>
            </div>
            </div>
            `;
// click para abrir el detalle
                card.addEventListener('click', ()=>openProductDetail(p));
                    grid.appendChild(card);
            });
            section.appendChild(grid);
            container.appendChild(section);
        }
    },

    buyProduct(productName) {
        const text = `Hola! Quiero la vela "${productName}".\nMi dirección de envío es: `;
        this.openSocialWithText(text);
    },

    openSocialWithText(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('¡Mensaje copiado al portapapeles!\nSerás redirigido a nuestro Instagram para que pegues el mensaje en nuestro chat.');
            window.open('https://www.instagram.com/velass.esencia/', '_blank');
        }).catch(() => {
            const waUrl = `https://api.whatsapp.com/send?phone=573005798487&text=${encodeURIComponent(text)}`;
            window.open(waUrl, '_blank');
        });
    }
};

// ------------------ Cart System (nuevo) ------------------
const CartSystem = {
    key: 'velass_cart',

    getCart() {
        return JSON.parse(localStorage.getItem(this.key) || '[]');
    },

    saveCart(cart) {
        localStorage.setItem(this.key, JSON.stringify(cart));
    },

    updateCartBadge() {
        const el = document.getElementById('cart-count');
        if (!el) return;
        const qty = this.getCart().reduce((s, i) => s + (i.qty || 0), 0);
        el.textContent = qty > 0 ? qty : '';
    },

    addToCart(product) {
        if (!product || (!product.id && !product.name)) return;
        const id = product.id || product.name;
        const cart = this.getCart();
        const existing = cart.find(it => String(it.id) === String(id));
        if (existing) {
            existing.qty = (existing.qty || 1) + 1;
        } else {
            cart.push({
                id,
                name: product.name,
                price: product.price || 0,
                img: product.img || '',
                qty: 1
            });
        }
        this.saveCart(cart);
        this.updateCartBadge();
        if (window.Toast && Toast.show) Toast.show('Añadido al carrito', 'success');
        else alert('Añadido al carrito');
    },

    removeItem(id) {
        const cart = this.getCart().filter(it => String(it.id) !== String(id));
        this.saveCart(cart);
        this.updateCartBadge();
    },

    clear() {
        localStorage.removeItem(this.key);
        this.updateCartBadge();
    },

    openCart() {
        const modal = document.getElementById('product-detail-modal');
        const content = document.getElementById('product-detail-inner');
        if (!modal || !content) return;

        const cart = this.getCart();
        const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

        if (!cart.length) {
            content.innerHTML = '<h3>Tu carrito</h3><p>Tu carrito está vacío.</p><div style="margin-top:1rem;"><button class="btn text-btn" id="close-cart-btn">Cerrar</button></div>';
            modal.classList.add('active');
            document.getElementById('close-cart-btn').addEventListener('click', () => modal.classList.remove('active'));
            return;
        }

        let html = '<h3>Tu carrito</h3><div style="margin-top:1rem;">';
        cart.forEach(it => {
            html += `<div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:0.75rem;">
                <img src="${it.img || 'https://via.placeholder.com/80x60?text=Img'}" alt="${it.name}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;">
                <div style="flex:1;">
                  <strong>${it.name}</strong><br>
                  <small>${formatter.format(it.price)} x ${it.qty}</small>
                </div>
                <div>
                  <button class="btn text-btn remove-item-btn" data-id="${it.id}">Eliminar</button>
                </div>
            </div>`;
        });
        const total = cart.reduce((s, it) => s + (it.price * (it.qty || 1)), 0);
        html += `</div><div style="margin-top:1rem;"><strong>Total: ${formatter.format(total)}</strong></div>
            <div style="margin-top:1rem; display:flex; gap:0.5rem;">
              <button class="btn primary-btn" id="checkout-btn">Ir a pagar</button>
              <button class="btn text-btn" id="close-cart-btn">Seguir comprando</button>
            </div>`;

        content.innerHTML = html;
        modal.classList.add('active');

        document.getElementById('close-cart-btn').addEventListener('click', () => modal.classList.remove('active'));
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.removeItem(id);
                this.openCart(); // re-render
            });
        });
        document.getElementById('checkout-btn').addEventListener('click', async () => {
            modal.classList.remove('active');
            await this.checkout();
        });
    },

    async checkout() {
        const cart = this.getCart();
        if (!cart.length) {
            if (window.Toast && Toast.show) Toast.show('El carrito está vacío', 'info');
            else alert('El carrito está vacío');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/checkout/wompi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cart,
                    redirect_url: window.location.origin + '/checkout-success.html'
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Error iniciando pago');
            }
            const data = await res.json();
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else if (data.redirect_url) {
                window.location.href = data.redirect_url;
            } else {
                throw new Error('No se recibi\u00f3 una URL de checkout desde el servidor');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            alert('No se pudo iniciar el pago. Revisa la consola para m\u00e1s detalles.');
        }
    },

    init() {
        this.updateCartBadge();
        window.CartSystem = this;
    }
};

// Inicializar badge al cargar documento
document.addEventListener('DOMContentLoaded', () => {
    try { CartSystem.init(); } catch (e) { console.error(e); }
});

// --- Vista Detallada de Producto (reemplazada) ---
function openProductDetail(product) {
    const modal = document.getElementById('product-detail-modal');
    const content = document.getElementById('product-detail-inner');
    if (!modal || !content) return;
    const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    content.innerHTML = `
        <img src="${product.img || 'https://via.placeholder.com/400x300?text=Imagen+Pendiente'}" alt="${product.name}">
        <h2 style="margin-top:0">${product.name}</h2>
        <p><strong>Categoría:</strong> ${product.category || '-'}</p>
        <p><strong>Descripci\u00f3n:</strong> ${product.description || ''}</p>
        <p><strong>Precio:</strong> ${formatter.format(product.price || 0)}</p>
        <div style="margin-top:1rem;">
            <button id="add-to-cart-btn" class="btn primary-btn">Agregar al carrito</button>
            <button id="buy-now-btn" class="btn secondary-btn">Comprar ahora</button>
        </div>
    `;
    modal.classList.add('active');

    // listeners
    const addBtn = document.getElementById('add-to-cart-btn');
    const buyBtn = document.getElementById('buy-now-btn');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            CartSystem.addToCart(product);
        });
    }
    if (buyBtn) {
        buyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            CartSystem.addToCart(product);
            await CartSystem.checkout();
        });
    }
}

// (rest of file continues...)
