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
        const categoryOrder = ['Día de la madre', 'Línea Bloom', 'Mini Scents', 'Terrario', 'Linea Pet soul'];
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
            
            if (category === 'Día de la madre') {
                title.style.color = '#e91e63';
                title.innerHTML += ' 🌸';
                const subtitle = document.createElement('p');
                subtitle.style.textAlign = 'center';
                subtitle.style.color = '#e91e63';
                subtitle.style.marginBottom = '2rem';
                subtitle.style.fontSize = '1.1rem';
                subtitle.innerHTML = '<em>Celebra a la mujer más importante con un detalle que ilumina el alma. ¡Sorpréndela con un regalo único y especial diseñado solo para ella! ❤️</em>';
                section.appendChild(title);
                section.appendChild(subtitle);
            } else {
                section.appendChild(title);
            }

            const grid = document.createElement('div');
            grid.className = 'product-grid';

            items.forEach(p => {
                const card = document.createElement('div');
                card.className = 'product-card';
                const imgUrl = p.img || 'https://via.placeholder.com/400x300?text=Imagen+Pendiente';
                
                let originalPrice = p.price;
                let displayPrice = formatter.format(p.price);
                let discountBadge = '';
                
                if (category === 'Día de la madre') {
                    const discountedPrice = originalPrice * 0.9; // 10% discount
                    displayPrice = `<span style="text-decoration:line-through;color:#999;font-size:0.85em;margin-right:5px;">${formatter.format(originalPrice)}</span> <span style="color:#e91e63;font-weight:bold;">${formatter.format(discountedPrice)}</span>`;
                    discountBadge = `<div style="position:absolute;top:10px;right:10px;background:#e91e63;color:white;padding:5px 10px;border-radius:12px;font-size:0.8em;font-weight:bold;z-index:1;box-shadow: 0 2px 5px rgba(0,0,0,0.2);">-10% OFF</div>`;
                }

                card.innerHTML = `
            <div class="product-img" style="background-image: url('${imgUrl}'); position:relative;">${discountBadge}</div>
            <div class="product-info">
            <h3 class="product-title">${p.name}</h3>
            <p class="product-desc">${p.description}</p>
            <div class="product-footer">
            <span class="product-price">${displayPrice}</span>
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

// Custom Candle System
const CustomCandleSystem = {
    init() {
        const form = document.getElementById('custom-candle-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const scent = document.getElementById('custom-scent').value;
                const color = document.getElementById('custom-color').value;
                const shape = document.getElementById('custom-shape').value;

                const text = `Hola! Quiero pedir una vela personalizada con la siguiente configuración:\n- Olor: ${scent}\n- Color: ${color}\n- Figura/Raza: ${shape}\n\nMi dirección de envío es: `;

                CatalogSystem.openSocialWithText(text);
                form.reset();
            });
        }
    }
};

// Authentication System
const AuthSystem = {
    init() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
            registerForm.addEventListener('submit', this.handleRegister.bind(this));

            document.getElementById('show-register').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-card').style.display = 'none';
                document.getElementById('register-card').style.display = 'block';
            });

            document.getElementById('show-login').addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('register-card').style.display = 'none';
                document.getElementById('login-card').style.display = 'block';
            });
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const user = await res.json();
                localStorage.setItem('currentUser', JSON.stringify({ name: user.name, email: user.email, role: user.role }));
                window.location.href = user.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                alert('Credenciales incorrectas');
            }
        } catch (err) {
            alert('Error de conexión con el servidor');
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const res = await fetch(`${API_BASE}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            if (res.ok) {
                const user = await res.json();
                localStorage.setItem('currentUser', JSON.stringify({ name: user.name, email: user.email, role: user.role }));
                window.location.href = 'index.html';
            } else {
                const data = await res.json();
                alert(data.error || 'Error al registrarse');
            }
        } catch (err) {
            alert('Error de conexión con el servidor');
        }
    }
};

// Admin System - Utility and Placeholder for admin.js
const AdminSystem = {
    isAdmin() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        return currentUser && currentUser.role === 'admin';
    }
};

// Animation System
const AnimationSystem = {
    init() {
        const reveals = document.querySelectorAll('.reveal');
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            }, { threshold: 0.1 });

            reveals.forEach(reveal => {
                observer.observe(reveal);
            });
        } else {
            reveals.forEach(reveal => reveal.classList.add('active'));
        }

        setTimeout(() => {
            reveals.forEach(reveal => {
                const windowHeight = window.innerHeight;
                const elementTop = reveal.getBoundingClientRect().top;
                if (elementTop < windowHeight - 50) {
                    reveal.classList.add('active');
                }
            });
        }, 100);
    }
};

// Theme System
const ThemeSystem = {
    init() {
        const toggleBtn = document.getElementById('theme-toggle');
        const iconPath = document.querySelector('#moon-icon path');
        const currentTheme = localStorage.getItem('theme') || 'light';

        const setDark = () => {
            document.body.setAttribute('data-theme', 'dark');
            if (iconPath) iconPath.setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
        };

        const setLight = () => {
            document.body.removeAttribute('data-theme');
            if (iconPath) iconPath.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
        };

        if (currentTheme === 'dark') setDark();

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isDark = document.body.getAttribute('data-theme') === 'dark';
                if (isDark) {
                    setLight();
                    localStorage.setItem('theme', 'light');
                } else {
                    setDark();
                    localStorage.setItem('theme', 'dark');
                }
            });
        }
    }
};

// =================== SOCIAL FEED SYSTEM ===================
const SocialFeedSystem = {
    DEFAULTS: {
        tiktok: 'https://www.tiktok.com/@velass.esencia/video/7632349492309789972',
        instagram: 'https://www.instagram.com/reel/DXhQc_8jeOh/'
    },

    async getConfig() {
        let tiktok = this.DEFAULTS.tiktok;
        let instagram = this.DEFAULTS.instagram;
        try {
            const tikRes = await fetch(`${API_BASE}/api/settings/social_tiktok`);
            if (tikRes.ok) {
                const data = await tikRes.json();
                if (data.value) tiktok = data.value;
            }
            const igRes = await fetch(`${API_BASE}/api/settings/social_instagram`);
            if (igRes.ok) {
                const data = await igRes.json();
                if (data.value) instagram = data.value;
            }
        } catch (e) {
            console.error('Error cargando settings sociales', e);
        }
        return { tiktok, instagram };
    },

    extractTikTokId(url) {
        const m = url.match(/video\/(\d+)/);
        return m ? m[1] : null;
    },

    extractInstagramShortcode(url) {
        const m = url.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
        return m ? m[2] : null;
    },

    async init() {
        const section = document.getElementById('social-feed-section');
        if (!section) return;
        const config = await this.getConfig();
        this.renderTikTok(config.tiktok);
        this.renderInstagram(config.instagram);
    },

    renderTikTok(url) {
        const wrapper = document.getElementById('tiktok-embed-wrapper');
        if (!wrapper) return;
        const videoId = this.extractTikTokId(url);
        if (!videoId) { wrapper.innerHTML = '<p style="padding:2rem;color:#999;text-align:center;">Video no disponible (Asegúrate de copiar el enlace largo que contiene "/video/...")</p>'; return; }
        wrapper.innerHTML = `
            <blockquote class="tiktok-embed"
                cite="${url}"
                data-video-id="${videoId}"
                style="max-width:605px;min-width:325px;width:100%;">
                <section>
                    <a target="_blank" rel="noopener noreferrer" href="https://www.tiktok.com/@velass.esencia">@velass.esencia</a>
                </section>
            </blockquote>`;
            
        // Reload TikTok script to process the newly injected blockquote
        const oldScript = document.getElementById('tiktok-embed-script');
        if (oldScript) oldScript.remove();
        const script = document.createElement('script');
        script.id = 'tiktok-embed-script';
        script.src = 'https://www.tiktok.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
    },

    renderInstagram(url) {
        const wrapper = document.getElementById('instagram-embed-wrapper');
        if (!wrapper) return;
        const code = this.extractInstagramShortcode(url);
        if (!code) { wrapper.innerHTML = '<p style="padding:2rem;color:#999;text-align:center;">Post no disponible</p>'; return; }
        const cleanUrl = `https://www.instagram.com/reel/${code}/`;
        wrapper.innerHTML = `
            <blockquote class="instagram-media"
                data-instgrm-permalink="${cleanUrl}"
                data-instgrm-version="14"
                style="background:#FFF;border:0;border-radius:12px;box-shadow:0 0 1px 0 rgba(0,0,0,.5),0 1px 10px 0 rgba(0,0,0,.15);margin:1px;max-width:540px;min-width:326px;padding:0;width:calc(100% - 2px);">
            </blockquote>`;
        if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    ThemeSystem.init();
    await AppSystem.init();
    await CatalogSystem.init();
    CustomCandleSystem.init();
    AuthSystem.init();
    AnimationSystem.init();
    SocialFeedSystem.init();

    // Cerrar modal de detalle de producto
    const m = document.getElementById('product-detail-modal');
    if (m) {
        m.addEventListener('click', e => {
            if (e.target === m || e.target.id === 'close-detail-modal') m.classList.remove('active');
        });
    }
});

// --- Vista Detallada de Producto ---
function openProductDetail(product) {
    const modal = document.getElementById('product-detail-modal');
    const content = document.getElementById('product-detail-inner');
    if (!modal || !content) return;
    
    let originalPrice = product.price;
    let displayPrice = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(product.price);
    
    if (product.category === 'Día de la madre') {
        const discountedPrice = originalPrice * 0.9; // 10% off
        displayPrice = `<span style="text-decoration:line-through;color:#999;font-size:0.85em;margin-right:5px;">${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(originalPrice)}</span> <span style="color:#e91e63;font-weight:bold;">${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(discountedPrice)}</span> <span style="color:#e91e63;font-size:0.85em;font-weight:bold;margin-left:5px;">(-10% OFF)</span>`;
    }

    content.innerHTML = `
        <img src="${product.img || 'https://via.placeholder.com/400x300?text=Imagen+Pendiente'}" alt="${product.name}">
        <h2>${product.name}</h2>
        <p><strong>Categoría:</strong> ${product.category}</p>
        <p><strong>Descripción:</strong> ${product.description}</p>
        <p><strong>Precio:</strong> ${displayPrice}</p>
        <button class="btn primary-btn" onclick="CatalogSystem.buyProduct('${product.name.replace(/'/g,'\\\\\'')}')">Pedir por WhatsApp/IG</button>
    `;
    modal.classList.add('active');
}

