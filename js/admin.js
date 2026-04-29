// =============================================
// ADMIN DASHBOARD SYSTEM - Velass&Esencia
// =============================================
// Nota: API_BASE ya está declarada en app.js (cargado primero)

// =================== TOAST SYSTEM ===================
const Toast = {
    show(message, type = 'success', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type] || '✅'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }
};

// =================== CHART HELPERS ===================
function getChartColors() {
    const dark = document.body.getAttribute('data-theme') === 'dark';
    return {
        text: dark ? '#f4ecf7' : '#4A235A',
        grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        bg: dark ? 'rgba(30,20,40,0.0)' : 'rgba(255,255,255,0.0)'
    };
}

function baseChartOptions(extra = {}) {
    const c = getChartColors();
    return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: true,
                labels: { color: c.text, font: { family: 'Outfit' } }
            },
            tooltip: { backgroundColor: 'rgba(30,20,40,0.85)', titleColor: '#fff', bodyColor: '#ddd' }
        },
        scales: {
            x: { ticks: { color: c.text }, grid: { color: c.grid } },
            y: { beginAtZero: true, ticks: { color: c.text }, grid: { color: c.grid } }
        },
        ...extra
    };
}

// =================== FINANCE SYSTEM ===================
const FinanceSystem = {
    transactions: [],

    async init() {
        await this.loadTransactions();
        this.renderTransactions();
        this.setupEventListeners();
    },

    async loadTransactions() {
        try {
            const res = await fetch(`${API_BASE}/api/transactions`);
            if (res.ok) {
                this.transactions = await res.json();
            } else {
                this.transactions = [];
            }
        } catch (e) {
            console.error(e);
            this.transactions = [];
        }
    },

    async addTransaction(type, category, amount, date, description) {
        try {
            const res = await fetch(`${API_BASE}/api/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, category, amount: parseFloat(amount), date, description })
            });
            if (res.ok) {
                const newT = await res.json();
                this.transactions.unshift(newT);
            }
        } catch (e) { console.error(e); }
    },

    async deleteTransaction(id) {
        try {
            const res = await fetch(`${API_BASE}/api/transactions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                this.transactions = this.transactions.filter(t => t.id !== id);
            }
        } catch (e) { console.error(e); }
    },

    getByMonth(month) { return this.transactions.filter(t => t.date.startsWith(month)); },

    getTotalIncome(month = null) {
        let f = this.transactions.filter(t => t.type === 'ingreso');
        if (month) f = f.filter(t => t.date.startsWith(month));
        return f.reduce((s, t) => s + parseFloat(t.amount), 0);
    },

    getTotalExpense(month = null) {
        let f = this.transactions.filter(t => t.type === 'egreso');
        if (month) f = f.filter(t => t.date.startsWith(month));
        return f.reduce((s, t) => s + parseFloat(t.amount), 0);
    },

    setupEventListeners() {
        const form = document.getElementById('transaction-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('trans-type').value;
            const category = document.getElementById('trans-category').value;
            const amount = document.getElementById('trans-amount').value;
            const date = document.getElementById('trans-date').value;
            const description = document.getElementById('trans-description').value;
            await this.addTransaction(type, category, amount, date, description);
            form.reset();
            document.getElementById('trans-date').valueAsDate = new Date();
            this.renderTransactions();
            FinanceUI.updateDashboard();
            Toast.show(`Transacción de ${type} registrada exitosamente`);
        });
    },

    renderTransactions() {
        const container = document.getElementById('transactions-list');
        if (!container) return;
        if (this.transactions.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999;padding:2rem 0;">No hay transacciones registradas</p>';
            return;
        }
        container.innerHTML = this.transactions.map(t => `
            <div class="transaction-item ${t.type}">
                <div class="trans-left">
                    <div class="trans-icon">${t.type === 'ingreso' ? '💰' : '💸'}</div>
                    <div class="trans-details">
                        <div class="trans-category">${t.category}</div>
                        <div class="trans-desc">${t.description || 'Sin descripción'}</div>
                        <div class="trans-date">${new Date(t.date + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    </div>
                </div>
                <div class="trans-right">
                    <div class="trans-amount ${t.type}">${t.type === 'ingreso' ? '+' : '-'}$${parseFloat(t.amount).toLocaleString('es-CO')}</div>
                    <button class="btn-delete-trans" title="Eliminar" onclick="FinanceSystem.deleteTransaction(${t.id}).then(() => { FinanceSystem.renderTransactions(); FinanceUI.updateDashboard(); })">🗑️</button>
                </div>
            </div>
        `).join('');
    }
};

// =================== FINANCE UI ===================
const FinanceUI = {
    updateDashboard() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const prevDate = new Date(); prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonth = prevDate.toISOString().slice(0, 7);

        const income = FinanceSystem.getTotalIncome(currentMonth);
        const expense = FinanceSystem.getTotalExpense(currentMonth);
        const profit = income - expense;
        const prevIncome = FinanceSystem.getTotalIncome(prevMonth);
        const prevExpense = FinanceSystem.getTotalExpense(prevMonth);
        const prevProfit = prevIncome - prevExpense;

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        const fmt = n => `$${n.toLocaleString('es-CO')}`;

        set('monthly-income', fmt(income));
        set('monthly-expense', fmt(expense));
        set('net-profit', fmt(profit));

        const margin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;
        set('profit-percentage', `${margin > 0 ? '+' : ''}${margin}%`);

        const incomeCount = FinanceSystem.transactions.filter(t => t.type === 'ingreso' && t.date.startsWith(currentMonth)).length;
        const expenseCount = FinanceSystem.transactions.filter(t => t.type === 'egreso' && t.date.startsWith(currentMonth)).length;
        set('income-count', `${incomeCount} transacciones`);
        set('expense-count', `${expenseCount} transacciones`);

        // Trend indicators
        this.setTrend('income-trend', income, prevIncome);
        this.setTrend('expense-trend', expense, prevExpense);
        this.setTrend('profit-trend', profit, prevProfit);

        AdminInventorySystem.updateStats();
        this.updateCharts(currentMonth);
    },

    setTrend(id, current, prev) {
        const el = document.getElementById(id);
        if (!el) return;
        if (prev === 0) { el.className = 'stat-trend flat'; el.textContent = '→ Sin datos previos'; return; }
        const pct = (((current - prev) / prev) * 100).toFixed(1);
        if (current > prev) { el.className = 'stat-trend up'; el.textContent = `▲ +${pct}% vs mes anterior`; }
        else if (current < prev) { el.className = 'stat-trend down'; el.textContent = `▼ ${pct}% vs mes anterior`; }
        else { el.className = 'stat-trend flat'; el.textContent = '→ Igual que mes anterior'; }
    },

    updateCharts(month) {
        this.updateWeekChart();
        this.updateExpenseChart(month);
        this.updateMonthlyTrendChart();
        this.updateDailyIncomeChart(month);
        this.updateCategoryExpenseChart(month);
    },

    updateWeekChart() {
        const ctx = document.getElementById('weekChart');
        if (!ctx) return;
        const today = new Date();
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today); d.setDate(d.getDate() - (6 - i));
            return d.toISOString().slice(0, 10);
        });
        const labels = days.map(d => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }));
        const income = days.map(date => FinanceSystem.transactions.filter(t => t.type === 'ingreso' && t.date === date).reduce((s, t) => s + t.amount, 0));
        const expense = days.map(date => FinanceSystem.transactions.filter(t => t.type === 'egreso' && t.date === date).reduce((s, t) => s + t.amount, 0));

        if (window._weekChart) window._weekChart.destroy();
        window._weekChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Ingresos', data: income, backgroundColor: 'rgba(76,175,80,0.75)', borderColor: '#4CAF50', borderWidth: 2, borderRadius: 6 },
                    { label: 'Egresos', data: expense, backgroundColor: 'rgba(244,67,54,0.75)', borderColor: '#F44336', borderWidth: 2, borderRadius: 6 }
                ]
            },
            options: baseChartOptions()
        });
    },

    updateExpenseChart(month) {
        const ctx = document.getElementById('expenseChart');
        if (!ctx) return;
        const categories = ['Compra de Materiales', 'Servicios', 'Gastos Operativos', 'Otros'];
        const data = categories.map(cat => FinanceSystem.transactions.filter(t => t.type === 'egreso' && t.category === cat && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0));
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#9966FF'];
        const c = getChartColors();

        if (window._expChart) window._expChart.destroy();
        window._expChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: categories, datasets: [{ data, backgroundColor: colors, borderColor: 'transparent', borderWidth: 2 }] },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: c.text, font: { family: 'Outfit' } } },
                    tooltip: { backgroundColor: 'rgba(30,20,40,0.85)', titleColor: '#fff', bodyColor: '#ddd' }
                }
            }
        });
    },

    updateMonthlyTrendChart() {
        const ctx = document.getElementById('monthlyTrendChart');
        if (!ctx) return;
        const year = new Date().getFullYear();
        const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
        const labels = months.map(m => new Date(m + '-01T12:00:00').toLocaleDateString('es-CO', { month: 'short' }));
        const income = months.map(m => FinanceSystem.getTotalIncome(m));
        const expense = months.map(m => FinanceSystem.getTotalExpense(m));
        const profit = months.map((_, i) => income[i] - expense[i]);

        if (window._monthlyChart) window._monthlyChart.destroy();
        window._monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Ingresos', data: income, borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)', borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 7 },
                    { label: 'Egresos', data: expense, borderColor: '#F44336', backgroundColor: 'rgba(244,67,54,0.08)', borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 4, pointHoverRadius: 7 },
                    { label: 'Ganancia Neta', data: profit, borderColor: '#9C27B0', backgroundColor: 'rgba(156,39,176,0.06)', borderWidth: 2, fill: false, tension: 0.4, borderDash: [5, 4], pointRadius: 3, pointHoverRadius: 6 }
                ]
            },
            options: baseChartOptions()
        });
    },

    updateDailyIncomeChart(month) {
        const ctx = document.getElementById('dailyIncomeChart');
        if (!ctx) return;
        const [y, m] = month.split('-').map(Number);
        const days = new Date(y, m, 0).getDate();
        const dayLabels = Array.from({ length: days }, (_, i) => `${i + 1}`);
        const incomeData = dayLabels.map(day => {
            const date = `${month}-${String(day).padStart(2, '0')}`;
            return FinanceSystem.transactions.filter(t => t.type === 'ingreso' && t.date === date).reduce((s, t) => s + t.amount, 0);
        });

        if (window._dailyChart) window._dailyChart.destroy();
        window._dailyChart = new Chart(ctx, {
            type: 'line',
            data: { labels: dayLabels, datasets: [{ label: 'Ingresos Diarios', data: incomeData, borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.12)', borderWidth: 2, fill: true, tension: 0.4 }] },
            options: baseChartOptions()
        });
    },

    updateCategoryExpenseChart(month) {
        const ctx = document.getElementById('categoryExpenseChart');
        if (!ctx) return;
        const categories = ['Compra de Materiales', 'Servicios', 'Gastos Operativos', 'Otros'];
        const data = categories.map(cat => FinanceSystem.transactions.filter(t => t.type === 'egreso' && t.category === cat && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0));

        if (window._catChart) window._catChart.destroy();
        window._catChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: categories, datasets: [{ label: 'Gastos', data, backgroundColor: ['rgba(255,99,132,0.75)', 'rgba(54,162,235,0.75)', 'rgba(255,206,86,0.75)', 'rgba(153,102,255,0.75)'], borderWidth: 0, borderRadius: 6 }] },
            options: { ...baseChartOptions(), indexAxis: 'y' }
        });
    }
};

function updateFinanceDashboard() { FinanceUI.updateDashboard(); }

// =================== TAB SYSTEM ===================
const TabSystem = {
    init() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
        });
    },
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const content = document.getElementById(tabName);
        if (content) content.classList.add('active');
        const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (btn) btn.classList.add('active');
    }
};

// =================== ADMIN INVENTORY SYSTEM ===================
const AdminInventorySystem = {
    async init() { await this.renderInventory(); this.setupModal(); },

    async updateStats() {
        const products = await AppSystem.getProducts();
        const el = document.getElementById('inventory-count');
        if (el) el.textContent = products.reduce((s, p) => s + (p.stock || 0), 0);
    },

    async renderInventory() {
        const tbody = document.getElementById('inventory-list');
        if (!tbody) return;
        const products = await AppSystem.getProducts();
        const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
        tbody.innerHTML = '';
        products.forEach(p => {
            let badge = p.stock === 0 ? '❌ Agotado' : p.stock <= 5 ? '⚠️ Bajo Stock' : '✅ En Stock';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${p.id}</td><td>${p.name}</td><td>${p.category}</td>
                <td>${fmt.format(p.price)}</td><td>${p.stock}</td><td>${badge}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="AdminSystem.editProduct(${p.id})">Editar</button>
                    <button class="action-btn del-btn" onclick="AdminSystem.deleteProduct(${p.id})">Eliminar</button>
                </td>`;
            tbody.appendChild(tr);
        });
        await this.updateStats();
    },

    setupModal() {
        const modal = document.getElementById('product-modal');
        const btnAdd = document.getElementById('btn-add-product');
        const btnCancel = document.getElementById('btn-cancel-modal');
        const form = document.getElementById('product-form');
        if (!btnAdd || !form) return;
        btnAdd.addEventListener('click', () => { form.reset(); document.getElementById('prod-id').value = ''; document.getElementById('modal-title').textContent = 'Añadir Producto'; modal.classList.add('active'); });
        btnCancel.addEventListener('click', () => modal.classList.remove('active'));
        form.addEventListener('submit', (e) => { e.preventDefault(); AdminSystem.saveProduct(); });
    }
};

// =================== ADMIN SYSTEM EXTENSION ===================
const AdminSystemExtended = {
    async editProduct(id) {
        const products = await AppSystem.getProducts();
        const p = products.find(p => p.id === id);
        if (!p) return;
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.name;
        if (document.getElementById('prod-category')) document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-desc').value = p.description;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-stock').value = p.stock;
        document.getElementById('prod-img').value = p.img;
        document.getElementById('modal-title').textContent = 'Editar Producto';
        document.getElementById('product-modal').classList.add('active');
    },

    async saveProduct() {
        const id = document.getElementById('prod-id').value;
        const body = {
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            description: document.getElementById('prod-desc').value,
            price: parseFloat(document.getElementById('prod-price').value),
            stock: parseInt(document.getElementById('prod-stock').value),
            img: document.getElementById('prod-img').value || ''
        };
        try {
            const url = id ? `${API_BASE}/api/products/${id}` : `${API_BASE}/api/products`;
            const method = id ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) {
                document.getElementById('product-modal').classList.remove('active');
                AdminInventorySystem.renderInventory();
                Toast.show('Producto guardado exitosamente');
            } else {
                const data = await res.json();
                Toast.show(data.error || 'Error al guardar producto', 'error');
            }
        } catch { Toast.show('Error de conexión con el servidor', 'error'); }
    },

    async deleteProduct(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
            if (res.ok) { AdminInventorySystem.renderInventory(); Toast.show('Producto eliminado'); }
        } catch { Toast.show('Error de conexión', 'error'); }
    }
};

AdminSystem.editProduct = AdminSystemExtended.editProduct;
AdminSystem.saveProduct = AdminSystemExtended.saveProduct;
AdminSystem.deleteProduct = AdminSystemExtended.deleteProduct;

// =================== SOCIAL MEDIA ADMIN ===================
const SocialMediaAdmin = {
    DEFAULTS: {
        tiktok: 'https://www.tiktok.com/@velass.esencia/video/7632349492309789972',
        instagram: 'https://www.instagram.com/reel/DXhQc_8jeOh/'
    },

    async load() {
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
        } catch (e) {}
        return { tiktok, instagram };
    },

    async save(platform, url) {
        try {
            await fetch(`${API_BASE}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: `social_${platform}`, value: url })
            });
        } catch (e) {}
    },

    async init() {
        const config = await this.load();
        const tikInput = document.getElementById('tiktok-url');
        const igInput = document.getElementById('instagram-url');
        if (tikInput) tikInput.value = config.tiktok;
        if (igInput) igInput.value = config.instagram;

        const btnTiktok = document.getElementById('btn-save-tiktok');
        const btnInstagram = document.getElementById('btn-save-instagram');

        if (btnTiktok) {
            btnTiktok.addEventListener('click', async () => {
                const url = tikInput.value.trim();
                if (!url.includes('tiktok.com')) { Toast.show('Ingresa una URL válida de TikTok', 'error'); return; }
                await this.save('tiktok', url);
                Toast.show('URL de TikTok guardada. Se verá en el catálogo.', 'success');
                this.renderPreview('tiktok', url);
            });
        }
        if (btnInstagram) {
            btnInstagram.addEventListener('click', async () => {
                const url = igInput.value.trim();
                if (!url.includes('instagram.com')) { Toast.show('Ingresa una URL válida de Instagram', 'error'); return; }
                await this.save('instagram', url);
                Toast.show('URL de Instagram guardada. Se verá en el catálogo.', 'success');
                this.renderPreview('instagram', url);
            });
        }

        // Show current previews
        this.renderPreview('tiktok', config.tiktok);
        this.renderPreview('instagram', config.instagram);
    },

    renderPreview(platform, url) {
        const container = document.getElementById(`${platform}-preview-mini`);
        if (!container) return;
        const label = platform === 'tiktok' ? '🎵 TikTok' : '📸 Instagram';
        container.innerHTML = `
            <p style="color:#4CAF50;font-weight:600;">✅ ${label} configurado</p>
            <a href="${url}" target="_blank" rel="noopener noreferrer" style="font-size:0.8rem;color:var(--primary-color);word-break:break-all;">${url.substring(0, 60)}${url.length > 60 ? '…' : ''}</a>
        `;
    }
};

// =================== INVENTORY SUB-TABS ===================
const InventorySubTabs = {
    init() {
        document.querySelectorAll('.inv-subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.subtab;
                document.querySelectorAll('.inv-subtab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.inv-subtab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const panel = document.getElementById(`inv-${target}`);
                if (panel) panel.classList.add('active');
                // Load materials when switching to that tab
                if (target === 'materials') RawMaterialsSystem.render();
            });
        });
    }
};

// =================== RAW MATERIALS SYSTEM ===================
const RawMaterialsSystem = {
    STORAGE_KEY: 'raw_materials',
    CAT_ICONS: { Cera: '🕯️', Esencias: '🌸', Moldes: '🔲', Colorantes: '🎨', Empaques: '📦', Mechas: '🔥', Otros: '🔧' },

    load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    save(materials) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(materials));
    },

    add(data) {
        const materials = this.load();
        const item = { id: Date.now(), ...data, updatedAt: new Date().toISOString() };
        materials.push(item);
        this.save(materials);
        return item;
    },

    update(id, data) {
        const materials = this.load().map(m =>
            m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m
        );
        this.save(materials);
    },

    delete(id) {
        this.save(this.load().filter(m => m.id !== id));
    },

    getStatus(qty, min) {
        if (!min || min === 0) return { label: '✅ OK', cls: 'ok' };
        if (qty === 0) return { label: '❌ Agotado', cls: 'agotado' };
        if (qty <= min) return { label: '⚠️ Bajo stock', cls: 'bajo' };
        return { label: '✅ OK', cls: 'ok' };
    },

    render() {
        const tbody = document.getElementById('materials-list');
        const alertsEl = document.getElementById('materials-alerts');
        const summaryEl = document.getElementById('materials-summary');
        if (!tbody) return;

        const materials = this.load();
        const fmt = n => n !== undefined && n !== '' && n !== null
            ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
            : '—';

        // Render alerts for low stock
        const lowStock = materials.filter(m => m.minQty > 0 && parseFloat(m.qty) <= parseFloat(m.minQty));
        if (alertsEl) {
            alertsEl.innerHTML = lowStock.length > 0
                ? `<div class="materials-alert-box">
                    ⚠️ <strong>${lowStock.length} material(es) con stock bajo o agotado:</strong>
                    ${lowStock.map(m => `<span class="mat-alert-badge">${this.CAT_ICONS[m.category] || '🔧'} ${m.name} (${m.qty} ${m.unit})</span>`).join('')}
                   </div>`
                : '';
        }

        // Render category summary
        if (summaryEl && materials.length > 0) {
            const cats = [...new Set(materials.map(m => m.category))];
            summaryEl.innerHTML = `<div class="mat-summary-row">
                ${cats.map(cat => {
                    const items = materials.filter(m => m.category === cat);
                    return `<div class="mat-summary-chip">
                        <span>${this.CAT_ICONS[cat] || '🔧'} ${cat}</span>
                        <strong>${items.length}</strong>
                    </div>`;
                }).join('')}
            </div>`;
        } else if (summaryEl) {
            summaryEl.innerHTML = '';
        }

        if (materials.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#999;">No hay materias primas registradas. Haz clic en "+ Añadir Material" para comenzar.</td></tr>';
            return;
        }

        tbody.innerHTML = materials.map(m => {
            const status = this.getStatus(parseFloat(m.qty), parseFloat(m.minQty));
            const icon = this.CAT_ICONS[m.category] || '🔧';
            return `<tr>
                <td><strong>${icon} ${m.name}</strong></td>
                <td>${m.category}</td>
                <td class="mat-qty ${status.cls === 'bajo' || status.cls === 'agotado' ? 'qty-low' : ''}">${m.qty}</td>
                <td>${m.unit}</td>
                <td>${m.minQty || '—'}</td>
                <td><span class="mat-status ${status.cls}">${status.label}</span></td>
                <td style="font-size:0.85rem;color:#999;max-width:150px;overflow:hidden;text-overflow:ellipsis;">${m.notes || '—'}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="RawMaterialsSystem.openEdit(${m.id})">Editar</button>
                    <button class="action-btn del-btn" onclick="RawMaterialsSystem.confirmDelete(${m.id})">Eliminar</button>
                </td>
            </tr>`;
        }).join('');
    },

    openAdd() {
        const form = document.getElementById('material-form');
        if (form) form.reset();
        document.getElementById('mat-id').value = '';
        document.getElementById('material-modal-title').textContent = 'Añadir Materia Prima';
        document.getElementById('material-modal').classList.add('active');
    },

    openEdit(id) {
        const m = this.load().find(m => m.id === id);
        if (!m) return;
        document.getElementById('mat-id').value = m.id;
        document.getElementById('mat-name').value = m.name;
        document.getElementById('mat-category').value = m.category;
        document.getElementById('mat-qty').value = m.qty;
        document.getElementById('mat-unit').value = m.unit;
        document.getElementById('mat-min').value = m.minQty || '';
        document.getElementById('mat-cost').value = m.cost || '';
        document.getElementById('mat-notes').value = m.notes || '';
        document.getElementById('material-modal-title').textContent = 'Editar Materia Prima';
        document.getElementById('material-modal').classList.add('active');
    },

    confirmDelete(id) {
        const m = this.load().find(m => m.id === id);
        if (!m) return;
        if (confirm(`¿Eliminar "${m.name}" del inventario?`)) {
            this.delete(id);
            this.render();
            Toast.show('Material eliminado');
        }
    },

    setupModal() {
        const modal = document.getElementById('material-modal');
        const btnAdd = document.getElementById('btn-add-material');
        const btnCancel = document.getElementById('btn-cancel-material-modal');
        const form = document.getElementById('material-form');
        if (!modal || !form) return;

        if (btnAdd) btnAdd.addEventListener('click', () => this.openAdd());
        if (btnCancel) btnCancel.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('mat-id').value;
            const data = {
                name: document.getElementById('mat-name').value.trim(),
                category: document.getElementById('mat-category').value,
                qty: parseFloat(document.getElementById('mat-qty').value) || 0,
                unit: document.getElementById('mat-unit').value,
                minQty: parseFloat(document.getElementById('mat-min').value) || 0,
                cost: parseFloat(document.getElementById('mat-cost').value) || null,
                notes: document.getElementById('mat-notes').value.trim()
            };

            if (id) {
                this.update(parseInt(id), data);
                Toast.show(`"${data.name}" actualizado`);
            } else {
                this.add(data);
                Toast.show(`"${data.name}" agregado al inventario`);
            }

            modal.classList.remove('active');
            this.render();
        });
    }
};

// =================== ADMIN PAGE INIT ===================
const AdminPageInit = {
    async init() {
        if (!document.querySelector('.admin-page')) return;

        TabSystem.init();
        InventorySubTabs.init();
        await FinanceSystem.init();
        FinanceUI.updateDashboard();
        AdminInventorySystem.init();
        RawMaterialsSystem.setupModal();
        await SocialMediaAdmin.init();

        const dateInput = document.getElementById('trans-date');
        if (dateInput) dateInput.valueAsDate = new Date();

        const financeMonth = document.getElementById('finance-month');
        if (financeMonth) financeMonth.value = new Date().toISOString().slice(0, 7);

        const reportMonth = document.getElementById('report-month');
        if (reportMonth) reportMonth.value = new Date().toISOString().slice(0, 7);

        const btnReport = document.getElementById('btn-generate-report');
        if (btnReport) {
            btnReport.addEventListener('click', () => {
                const month = document.getElementById('report-month').value;
                this.generateReport(month);
            });
        }

        // Re-render charts when theme changes
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            setTimeout(() => FinanceUI.updateDashboard(), 50);
        });
    },

    generateReport(month) {
        const income = FinanceSystem.getTotalIncome(month);
        const expense = FinanceSystem.getTotalExpense(month);
        const profit = income - expense;
        const margin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;
        const fmt = n => `$${n.toLocaleString('es-CO')}`;

        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('report-total-income', fmt(income));
        set('report-total-expense', fmt(expense));
        set('report-net-profit', fmt(profit));
        set('report-margin', `${margin}%`);

        FinanceUI.updateCharts(month);
        Toast.show('Reporte generado correctamente', 'info');
    }
};

document.addEventListener('DOMContentLoaded', () => { AdminPageInit.init(); });
