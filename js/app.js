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

// Admin System
const AdminSystem = {
    async init() {
        if (document.querySelector('.admin-page')) {
            await this.updateStats();
            await this.renderInventory();
            this.setupModal();
        }
    },

    isAdmin() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        return currentUser && currentUser.role === 'admin';
    },

    async updateStats() {
        const products = await AppSystem.getProducts();
        const usersData = await AppSystem.getUsersCount();
        const inventoryCount = document.getElementById('inventory-count');
        const usersCount = document.getElementById('users-count');
        if (inventoryCount) inventoryCount.textContent = products.length;
        if (usersCount) usersCount.textContent = usersData.count;
    },

    async renderInventory() {
        const tbody = document.getElementById('inventory-list');
        if (!tbody) return;
        const products = await AppSystem.getProducts();
        tbody.innerHTML = '';
        const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${p.id}</td>
                <td>${p.name}</td>
                <td>${formatter.format(p.price)}</td>
                <td>${p.stock}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="AdminSystem.editProduct(${p.id})">Editar</button>
                    <button class="action-btn del-btn" onclick="AdminSystem.deleteProduct(${p.id})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        await this.updateStats();
    },

    setupModal() {
        const modal = document.getElementById('product-modal');
        const btnAdd = document.getElementById('btn-add-product');
        const btnCancel = document.getElementById('btn-cancel-modal');
        const form = document.getElementById('product-form');

        if (!btnAdd || !btnCancel || !form) return;

        btnAdd.addEventListener('click', () => {
            form.reset();
            document.getElementById('prod-id').value = '';
            document.getElementById('modal-title').textContent = 'Añadir Producto';
            modal.classList.add('active');
        });

        btnCancel.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });
    },

    async saveProduct() {
        const idInput = document.getElementById('prod-id').value;
        const name = document.getElementById('prod-name').value;
        let category = document.getElementById('prod-category').value;
        const description = document.getElementById('prod-desc').value;
        const price = parseFloat(document.getElementById('prod-price').value);
        const stock = parseInt(document.getElementById('prod-stock').value);
        const img = document.getElementById('prod-img').value || '';

        // Normalize category before sending
        category = normalizeCategory(category);

        const body = { name, category, description, price, stock, img };

        try {
            let res;
            if (idInput) {
                res = await fetch(`${API_BASE}/api/products/${idInput}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } else {
                res = await fetch(`${API_BASE}/api/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            }

            if (res.ok) {
                document.getElementById('product-modal').classList.remove('active');
                await this.renderInventory();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al guardar producto');
            }
        } catch (err) {
            alert('Error de conexión con el servidor');
        }
    },

    async editProduct(id) {
        const products = await AppSystem.getProducts();
        const product = products.find(p => p.id === id);
        if (product) {
            document.getElementById('prod-id').value = product.id;
            document.getElementById('prod-name').value = product.name;
            if (document.getElementById('prod-category')) {
                document.getElementById('prod-category').value = product.category ? normalizeCategory(product.category) : 'Línea Bloom';
            }
            document.getElementById('prod-desc').value = product.description;
            document.getElementById('prod-price').value = product.price;
            document.getElementById('prod-stock').value = product.stock;
            document.getElementById('prod-img').value = product.img;

            document.getElementById('modal-title').textContent = 'Editar Producto';
            document.getElementById('product-modal').classList.add('active');
        }
    },

    async deleteProduct(id) {
        if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            try {
                const res = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    await this.renderInventory();
                }
            } catch (err) {
                alert('Error de conexión con el servidor');
            }
        }
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

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    ThemeSystem.init();
    await AppSystem.init();
    await CatalogSystem.init();
    CustomCandleSystem.init();
    AuthSystem.init();
    await AdminSystem.init();
    AnimationSystem.init();
});
// --- Vista Detallada de Producto ---
function openProductDetail(product) {
    const modal = document.getElementById('product-detail-modal');
    const content = document.getElementById('product-detail-inner');
    if (!modal || !content) return;
    content.innerHTML = `
        <img src="${product.img || 'https://via.placeholder.com/400x300?text=Imagen+Pendiente'}" alt="${product.name}">
        <h2 style="margin-top:0">${product.name}</h2>
        <p><strong>Categoría:</strong> ${product.category}</p>
        <p><strong>Descripción:</strong> ${product.description}</p>
        <p><strong>Precio:</strong> ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(product.price)}</p>
        <button class="btn primary-btn" onclick="CatalogSystem.buyProduct('${product.name.replace(/'/g,'\\\\\'')}')">Pedir por WhatsApp/IG</button>
    `;
    modal.classList.add('active');
}

// Cerrar modal
document.addEventListener('DOMContentLoaded', ()=>{
    const m = document.getElementById('product-detail-modal');
    if (m) {
        m.addEventListener('click', e=>{
            if (e.target === m || e.target.id === 'close-detail-modal') m.classList.remove('active');
        });
    }
});
