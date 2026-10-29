// =============================================
// Velass&Esencia - Frontend Application
// Connects to backend API for persistent data
// =============================================

const API_BASE = '';  // Same origin, no prefix needed

// --- Sesión: la autoridad es el servidor (cookie httpOnly) ---
// Si una llamada al panel devuelve 401 (sesión vencida), se vuelve al login.
const nativeFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
    const res = await nativeFetch(...args);
    try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        const isAuthCall = url.includes('/api/me') || url.includes('/api/login') || url.includes('/api/register');
        if (res.status === 401 && !isAuthCall && window.location.pathname.includes('admin')) {
            window.location.href = 'login.html?next=admin.html';
        }
    } catch (err) { /* nunca romper la petición */ }
    return res;
};

// --- Utilidades para insertar datos de la BD sin romper el HTML (anti-XSS) ---
function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeHttpUrl(value) {
    const url = String(value === null || value === undefined ? '' : value).trim();
    return /^https?:\/\//i.test(url) ? url : '';
}

function safeImageUrl(value) {
    return safeHttpUrl(value) || 'https://placehold.co/400x300?text=Imagen+Pendiente';
}

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
    authUser: null,

    async init() {
        await this.refreshAuth();
        this.setupNavigation();
    },

    // La sesión real vive en una cookie httpOnly: el servidor decide quién es quién.
    async refreshAuth() {
        try {
            const res = await fetch(`${API_BASE}/api/me`, { credentials: 'same-origin' });
            if (res.ok) {
                this.authUser = await res.json();
                try { localStorage.setItem('currentUser', JSON.stringify(this.authUser)); } catch (e) { /* modo privado */ }
            } else {
                this.authUser = null;
                localStorage.removeItem('currentUser');
            }
        } catch (err) {
            this.authUser = null;
            try { localStorage.removeItem('currentUser'); } catch (e) { /* modo privado */ }
        }
        this.renderAuthNav(this.authUser);
        return this.authUser;
    },

    renderAuthNav(currentUser) {
        const navLogin = document.getElementById('nav-login');
        const navLogout = document.getElementById('nav-logout');
        const navAdmin = document.getElementById('nav-admin');

        if (currentUser) {
            if (navLogin) navLogin.style.display = 'none';
            if (navLogout) navLogout.style.display = 'flex';
            if (navAdmin) navAdmin.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
        } else {
            if (navLogin) navLogin.style.display = 'flex';
            if (navLogout) navLogout.style.display = 'none';
            if (navAdmin) navAdmin.style.display = 'none';
        }
    },

    setupNavigation() {
        const logoutBtn = document.getElementById('nav-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'same-origin' });
                } catch (err) { /* la sesión local se limpia igual */ }
                this.authUser = null;
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }
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
        if (!Array.isArray(products) || products.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding: 2rem; color: #999;">No hay productos disponibles en este momento. ✨</p>';
            return;
        }
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
                const imgUrl = safeImageUrl(p.img);
                
                let originalPrice = p.price;
                let displayPrice = formatter.format(p.price);
                let discountBadge = '';
                
                if (category === 'Día de la madre') {
                    const discountedPrice = originalPrice * 0.9; // 10% discount
                    displayPrice = `<span style="text-decoration:line-through;color:#999;font-size:0.85em;margin-right:5px;">${formatter.format(originalPrice)}</span> <span style="color:#e91e63;font-weight:bold;">${formatter.format(discountedPrice)}</span>`;
                    discountBadge = `<div style="position:absolute;top:10px;right:10px;background:#e91e63;color:white;padding:5px 10px;border-radius:12px;font-size:0.8em;font-weight:bold;z-index:1;box-shadow: 0 2px 5px rgba(0,0,0,0.2);">-10% OFF</div>`;
                }

                card.innerHTML = `
            <div class="product-img" style="background-image: url('${escapeHtml(imgUrl)}'); position:relative;">${discountBadge}</div>
            <div class="product-info">
            <h3 class="product-title">${escapeHtml(p.name)}</h3>
            <p class="product-desc">${escapeHtml(p.description || '')}</p>
            <div class="product-footer">
            <span class="product-price">${displayPrice}</span>
            </div>
            </div>
            `;
// click para abrir el detalle
            card.addEventListener('click', ()=>openProductDetail(p));

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn cart-add-btn';
            addBtn.textContent = 'Añadir al carrito';
            addBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                CartSystem.add(p);
            });
            card.querySelector('.product-info').appendChild(addBtn);

                grid.appendChild(card);
            });
            section.appendChild(grid);
            container.appendChild(section);
        }
    },

    // Precio efectivo (con el descuento de "Día de la madre" mientras no esté en BD — CV-3)
    effectivePrice(product) {
        const price = Number(product && product.price) || 0;
        return normalizeCategory(product && product.category) === 'Día de la madre' ? price * 0.9 : price;
    },

    whatsappNumber: null,

    // Número configurable desde el panel (setting whatsapp_number); si falta, el de por defecto.
    async initWhatsApp() {
        try {
            const res = await fetch(`${API_BASE}/api/settings/whatsapp_number`);
            if (res.ok) {
                const data = await res.json();
                this.whatsappNumber = WhatsApp.normalizeWhatsAppNumber(data.value);
            }
        } catch (err) {
            console.error('Error cargando el número de WhatsApp:', err);
        }
        if (!this.whatsappNumber) this.whatsappNumber = WhatsApp.DEFAULT_NUMBER;

        const floatBtn = document.getElementById('whatsapp-float');
        const generalUrl = WhatsApp.buildWhatsAppUrl(this.whatsappNumber, WhatsApp.buildGeneralMessage());
        if (floatBtn && generalUrl) {
            floatBtn.href = generalUrl;
            floatBtn.target = '_blank';
            floatBtn.rel = 'noopener noreferrer';
        }
    },

    buyProduct(product) {
        this.openWhatsApp(WhatsApp.buildProductMessage(product || {}));
    },

    openWhatsApp(message) {
        const url = WhatsApp.buildWhatsAppUrl(this.whatsappNumber || WhatsApp.DEFAULT_NUMBER, message);
        if (!url) {
            alert('No hay un número de WhatsApp configurado. Escríbenos por Instagram.');
            return;
        }
        try {
            window.dispatchEvent(new CustomEvent('order_intent', { detail: { message } }));
        } catch (err) { /* sin analytics */ }
        window.open(url, '_blank', 'noopener');
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

                const text = WhatsApp.buildCustomMessage({ scent, color, shape });

                CatalogSystem.openWhatsApp(text);
                form.reset();
            });
        }
    }
};

// Candle Test System
const CandleTestSystem = {
    currentStep: 1,
    answers: [],
    results: {
        relax: {
            title: "Línea Bloom - Lavanda & Calma",
            desc: "Eres una persona que busca la paz interior. Tu vela ideal es de la Línea Bloom con esencia de Lavanda. Perfecta para desconectar tras un largo día y sumergirte en un estado de serenidad total.",
            img: "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?auto=format&fit=crop&q=80&w=400"
        },
        energy: {
            title: "Mini Scents - Cítricos Vibrantes",
            desc: "¡Tu energía es contagiosa! Necesitas aromas que te den ese impulso extra. Tu vela ideal es de nuestra colección Mini Scents con notas de Limón y Menta, ideal para mañanas productivas.",
            img: "https://images.unsplash.com/photo-1596435707124-33109de82490?auto=format&fit=crop&q=80&w=400"
        },
        romance: {
            title: "Edición Especial - Vainilla Francesa",
            desc: "Amas los detalles clásicos y los ambientes acogedores. Tu vela ideal es nuestra edición de Vainilla y Rosas. Crea una atmósfera sofisticada y romántica en cualquier rincón de tu hogar.",
            img: "https://images.unsplash.com/photo-1534629902730-df1195143821?auto=format&fit=crop&q=80&w=400"
        },
        focus: {
            title: "Línea Terrario - Sándalo & Bosque",
            desc: "La concentración es tu superpoder. Tu vela ideal es de la Línea Terrario con aroma a Sándalo. Te ayudará a mantener el enfoque mientras trabajas o lees tu libro favorito.",
            img: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=400"
        }
    },

    init() {
        const testSection = document.getElementById('candle-test');
        if (!testSection) return;

        const options = document.querySelectorAll('.option-btn');
        options.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleAnswer(btn.dataset.value);
            });
        });

        const restartBtn = document.getElementById('restart-test');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restart());
        }
    },

    handleAnswer(value) {
        this.answers.push(value);
        if (this.currentStep < 4) {
            this.goToStep(this.currentStep + 1);
        } else {
            this.showResult();
        }
    },

    goToStep(step) {
        const currentEl = document.querySelector(`.test-step[data-step="${this.currentStep}"]`);
        const nextEl = document.querySelector(`.test-step[data-step="${step}"]`);
        
        if (currentEl) currentEl.classList.remove('active');
        if (nextEl) nextEl.classList.add('active');
        
        this.currentStep = step;
        this.updateProgress();
    },

    updateProgress() {
        const fill = document.getElementById('progress-fill');
        if (fill) {
            const percentage = (this.currentStep / 4) * 100;
            fill.style.width = `${percentage}%`;
        }
    },

    showResult() {
        const counts = this.answers.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});
        
        const resultKey = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        const result = this.results[resultKey];

        document.querySelector(`.test-step[data-step="${this.currentStep}"]`).classList.remove('active');
        const resultEl = document.getElementById('test-result');
        resultEl.style.display = 'block';

        document.getElementById('result-title').textContent = result.title;
        document.getElementById('result-desc').textContent = result.desc;
        document.getElementById('result-img').style.backgroundImage = `url('${result.img}')`;
        
        this.updateProgress();
    },

    restart() {
        this.currentStep = 1;
        this.answers = [];
        document.getElementById('test-result').style.display = 'none';
        this.goToStep(1);
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
                credentials: 'same-origin',
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const user = await res.json();
                AppSystem.authUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                const next = new URLSearchParams(window.location.search).get('next');
                const target = user.role === 'admin' ? 'admin.html' : 'index.html';
                window.location.href = (next === 'admin.html' && user.role === 'admin') ? next : target;
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
                credentials: 'same-origin',
                body: JSON.stringify({ name, email, password })
            });

            if (res.ok) {
                const user = await res.json();
                AppSystem.authUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
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
    // Solo para pintar la UI: la autorización real la valida el servidor.
    isAdmin() {
        return Boolean(AppSystem.authUser && AppSystem.authUser.role === 'admin');
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

// Sidebar System
const SidebarSystem = {
    init() {
        const hamburger = document.getElementById('hamburger-btn');
        const sidebar = document.getElementById('sidebar-menu');
        const overlay = document.getElementById('sidebar-overlay');
        const closeBtn = document.getElementById('close-sidebar');
        const links = document.querySelectorAll('.sidebar-nav a');

        if (!hamburger || !sidebar || !overlay) return;

        const toggleMenu = () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
        };

        hamburger.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
        if (closeBtn) closeBtn.addEventListener('click', toggleMenu);

        links.forEach(link => {
            link.addEventListener('click', () => {
                if (sidebar.classList.contains('open')) toggleMenu();
            });
        });
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
        const safeUrl = safeHttpUrl(url);
        const videoId = safeUrl ? this.extractTikTokId(safeUrl) : null;
        if (!videoId) { wrapper.innerHTML = '<p style="padding:2rem;color:#999;text-align:center;">Video no disponible (Asegúrate de copiar el enlace largo que contiene "/video/...")</p>'; return; }
        wrapper.innerHTML = `
            <blockquote class="tiktok-embed"
                cite="${escapeHtml(safeUrl)}"
                data-video-id="${escapeHtml(videoId)}"
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
        const safeUrl = safeHttpUrl(url);
        const code = safeUrl ? this.extractInstagramShortcode(safeUrl) : null;
        if (!code) { wrapper.innerHTML = '<p style="padding:2rem;color:#999;text-align:center;">Post no disponible</p>'; return; }
        const cleanUrl = `https://www.instagram.com/reel/${escapeHtml(code)}/`;
        wrapper.innerHTML = `
            <blockquote class="instagram-media"
                data-instgrm-permalink="${cleanUrl}"
                data-instgrm-version="14"
                style="background:#FFF;border:0;border-radius:12px;box-shadow:0 0 1px 0 rgba(0,0,0,.5),0 1px 10px 0 rgba(0,0,0,.15);margin:1px;max-width:540px;min-width:326px;padding:0;width:calc(100% - 2px);">
            </blockquote>`;
        if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
    }
};

// =================== CARRITO / PEDIDO MÚLTIPLE ===================
const CartSystem = {
    items: [],
    storage: null,
    drawer: null,
    overlay: null,

    init() {
        if (!document.getElementById('cart-btn')) return;
        try { this.storage = window.localStorage; } catch (e) { this.storage = null; }
        this.items = Cart.load(this.storage);
        this.drawer = document.getElementById('cart-drawer');
        this.overlay = document.getElementById('cart-overlay');
        this.bind();
        this.render();
    },

    bind() {
        const openBtn = document.getElementById('cart-btn');
        const closeBtn = document.getElementById('cart-close');
        const checkoutBtn = document.getElementById('cart-checkout');
        const clearBtn = document.getElementById('cart-clear');
        if (openBtn) openBtn.addEventListener('click', () => this.openPanel());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closePanel());
        if (this.overlay) this.overlay.addEventListener('click', () => this.closePanel());
        if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.checkout());
        if (clearBtn) clearBtn.addEventListener('click', () => {
            if (this.items.length === 0) return;
            this.items = [];
            this.persist();
            this.render();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') this.closePanel();
        });
    },

    openPanel() {
        if (!this.drawer) return;
        this.drawer.classList.add('open');
        if (this.overlay) this.overlay.classList.add('active');
        this.drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    },

    closePanel() {
        if (!this.drawer) return;
        this.drawer.classList.remove('open');
        if (this.overlay) this.overlay.classList.remove('active');
        this.drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    },

    add(product) {
        if (!product) return;
        const effective = CatalogSystem.effectivePrice(product);
        this.items = Cart.addItem(this.items, Object.assign({}, product, { price: effective }));
        this.persist();
        this.render();
        this.openPanel();
    },

    changeQty(id, delta) {
        const current = this.items.find((item) => item.id === Number(id));
        if (!current) return;
        const nextQty = current.qty + delta;
        this.items = nextQty < 1 ? Cart.removeItem(this.items, id) : Cart.setQty(this.items, id, nextQty);
        this.persist();
        this.render();
    },

    remove(id) {
        this.items = Cart.removeItem(this.items, id);
        this.persist();
        this.render();
    },

    persist() {
        Cart.save(this.storage, this.items);
    },

    checkout() {
        const message = Cart.buildMessage(this.items);
        if (!message) return;
        AppSystem.openWhatsApp(message);
        this.closePanel();
    },

    renderItem(item) {
        const row = document.createElement('div');
        row.className = 'cart-item';

        const img = document.createElement('img');
        img.className = 'cart-item-img';
        img.src = safeImageUrl(item.img);
        img.alt = item.name;
        img.loading = 'lazy';

        const info = document.createElement('div');
        info.className = 'cart-item-info';

        const name = document.createElement('p');
        name.className = 'cart-item-name';
        name.textContent = item.name;

        const price = document.createElement('p');
        price.className = 'cart-item-price';
        price.textContent = WhatsApp.formatCOP(item.price) + ' c/u';

        const qty = document.createElement('div');
        qty.className = 'cart-item-qty';
        const minus = document.createElement('button');
        minus.type = 'button';
        minus.textContent = '−';
        minus.setAttribute('aria-label', 'Quitar una unidad de ' + item.name);
        minus.addEventListener('click', () => this.changeQty(item.id, -1));

        const qtyValue = document.createElement('span');
        qtyValue.textContent = String(item.qty);

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.textContent = '+';
        plus.setAttribute('aria-label', 'Añadir una unidad de ' + item.name);
        plus.addEventListener('click', () => this.changeQty(item.id, 1));

        qty.append(minus, qtyValue, plus);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'cart-item-remove';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', 'Eliminar ' + item.name + ' del carrito');
        removeBtn.addEventListener('click', () => this.remove(item.id));

        info.append(name, price, qty);
        row.append(img, info, removeBtn);
        return row;
    },

    render() {
        const itemsEl = document.getElementById('cart-items');
        const emptyEl = document.getElementById('cart-empty');
        const totalEl = document.getElementById('cart-total');
        const countEl = document.getElementById('cart-count');
        const checkoutBtn = document.getElementById('cart-checkout');
        const clearBtn = document.getElementById('cart-clear');

        const total = Cart.count ? Cart.subtotal(this.items) : 0;
        const count = Cart.count(this.items);

        if (countEl) {
            countEl.textContent = String(count);
            countEl.hidden = count === 0;
        }
        if (totalEl) totalEl.textContent = WhatsApp.formatCOP(total);
        if (checkoutBtn) checkoutBtn.disabled = this.items.length === 0;
        if (clearBtn) clearBtn.disabled = this.items.length === 0;
        if (emptyEl) emptyEl.style.display = this.items.length === 0 ? 'block' : 'none';

        if (!itemsEl) return;
        itemsEl.textContent = '';
        this.items.forEach((item) => itemsEl.appendChild(this.renderItem(item)));
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    ThemeSystem.init();
    SidebarSystem.init();
    await AppSystem.init();
    await AppSystem.initWhatsApp();
    await CatalogSystem.init();
    CartSystem.init();
    CustomCandleSystem.init();
    CandleTestSystem.init();
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

    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const isMotherDay = normalizeCategory(product.category) === 'Día de la madre';
    const price = Number(product.price) || 0;

    content.textContent = '';

    const img = document.createElement('img');
    img.src = safeImageUrl(product.img);
    img.alt = String(product.name || 'Vela');
    img.loading = 'lazy';
    content.appendChild(img);

    const title = document.createElement('h2');
    title.textContent = String(product.name || '');
    content.appendChild(title);

    const addRow = (label, value) => {
        const row = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = label;
        row.appendChild(strong);
        row.appendChild(document.createTextNode(' ' + value));
        content.appendChild(row);
    };
    addRow('Categoría:', String(product.category || ''));
    addRow('Descripción:', String(product.description || ''));

    const priceRow = document.createElement('p');
    const priceLabel = document.createElement('strong');
    priceLabel.textContent = 'Precio:';
    priceRow.appendChild(priceLabel);
    priceRow.appendChild(document.createTextNode(' '));
    if (isMotherDay) {
        const original = document.createElement('span');
        original.style.textDecoration = 'line-through';
        original.style.color = '#999';
        original.style.fontSize = '0.85em';
        original.style.marginRight = '5px';
        original.textContent = fmt.format(price);

        const discounted = document.createElement('span');
        discounted.style.color = '#e91e63';
        discounted.style.fontWeight = 'bold';
        discounted.textContent = fmt.format(price * 0.9);

        priceRow.appendChild(original);
        priceRow.appendChild(discounted);
    } else {
        priceRow.appendChild(document.createTextNode(fmt.format(price)));
    }
    content.appendChild(priceRow);

    const button = document.createElement('button');
    button.className = 'btn primary-btn';
    button.textContent = 'Pedir por WhatsApp';
    button.addEventListener('click', () => CatalogSystem.buyProduct(product));
    content.appendChild(button);

    const addToCartBtn = document.createElement('button');
    addToCartBtn.type = 'button';
    addToCartBtn.className = 'btn text-btn';
    addToCartBtn.textContent = 'Añadir al carrito';
    addToCartBtn.addEventListener('click', () => CartSystem.add(product));
    content.appendChild(addToCartBtn);

    modal.classList.add('active');
}

