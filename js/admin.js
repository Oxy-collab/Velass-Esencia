// =============================================
// ADMIN DASHBOARD SYSTEM - Gestión Financiera
// =============================================

const API_BASE = '';

// =================== FINANCE SYSTEM ===================
const FinanceSystem = {
    transactions: [],

    async init() {
        this.loadTransactions();
        this.renderTransactions();
        this.updateDashboard();
        this.setupEventListeners();
    },

    loadTransactions() {
        const stored = localStorage.getItem('transactions');
        this.transactions = stored ? JSON.parse(stored) : [];
    },

    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    },

    addTransaction(type, category, amount, date, description) {
        const transaction = {
            id: Date.now(),
            type,
            category,
            amount: parseFloat(amount),
            date,
            description,
            created_at: new Date().toISOString()
        };
        this.transactions.unshift(transaction);
        this.saveTransactions();
        return transaction;
    },

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveTransactions();
    },

    getTransactionsByMonth(month) {
        return this.transactions.filter(t => t.date.startsWith(month));
    },

    getTotalIncome(month = null) {
        let filtered = this.transactions.filter(t => t.type === 'ingreso');
        if (month) filtered = filtered.filter(t => t.date.startsWith(month));
        return filtered.reduce((sum, t) => sum + t.amount, 0);
    },

    getTotalExpense(month = null) {
        let filtered = this.transactions.filter(t => t.type === 'egreso');
        if (month) filtered = filtered.filter(t => t.date.startsWith(month));
        return filtered.reduce((sum, t) => sum + t.amount, 0);
    },

    setupEventListeners() {
        const form = document.getElementById('transaction-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const type = document.getElementById('trans-type').value;
                const category = document.getElementById('trans-category').value;
                const amount = document.getElementById('trans-amount').value;
                const date = document.getElementById('trans-date').value;
                const description = document.getElementById('trans-description').value;

                this.addTransaction(type, category, amount, date, description);
                form.reset();
                this.renderTransactions();
                this.updateDashboard();
                alert('✅ Transacción registrada exitosamente');
            });
        }
    },

    renderTransactions() {
        const container = document.getElementById('transactions-list');
        if (!container) return;

        if (this.transactions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No hay transacciones registradas</p>';
            return;
        }

        container.innerHTML = this.transactions.map(t => `
            <div class="transaction-item ${t.type}">
                <div class="trans-left">
                    <div class="trans-icon">${t.type === 'ingreso' ? '💰' : '💸'}</div>
                    <div class="trans-details">
                        <div class="trans-category">${t.category}</div>
                        <div class="trans-desc">${t.description || 'Sin descripción'}</div>
                        <div class="trans-date">${new Date(t.date).toLocaleDateString('es-CO')}</div>
                    </div>
                </div>
                <div class="trans-right">
                    <div class="trans-amount ${t.type}">
                        ${t.type === 'ingreso' ? '+' : '-'}$${t.amount.toLocaleString('es-CO')}
                    </div>
                    <button class="btn-delete-trans" onclick="FinanceSystem.deleteTransaction(${t.id}); FinanceSystem.renderTransactions(); FinanceSystem.updateDashboard();" title="Eliminar">🗑️</button>
                </div>
            </div>
        `).join('');
    }
};

// =================== FINANCE UI ===================
const FinanceUI = {
    updateDashboard() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const income = FinanceSystem.getTotalIncome(currentMonth);
        const expense = FinanceSystem.getTotalExpense(currentMonth);
        const profit = income - expense;

        // Update main stats
        const incomeEl = document.getElementById('monthly-income');
        const expenseEl = document.getElementById('monthly-expense');
        const profitEl = document.getElementById('net-profit');
        const profitPercentEl = document.getElementById('profit-percentage');
        const incomeCountEl = document.getElementById('income-count');
        const expenseCountEl = document.getElementById('expense-count');

        if (incomeEl) incomeEl.textContent = `$${income.toLocaleString('es-CO')}`;
        if (expenseEl) expenseEl.textContent = `$${expense.toLocaleString('es-CO')}`;
        if (profitEl) profitEl.textContent = `$${profit.toLocaleString('es-CO')}`;
        
        const profitMargin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;
        if (profitPercentEl) profitPercentEl.textContent = `${profitMargin > 0 ? '+' : ''}${profitMargin}%`;

        const incomeCount = FinanceSystem.transactions.filter(t => t.type === 'ingreso' && t.date.startsWith(currentMonth)).length;
        const expenseCount = FinanceSystem.transactions.filter(t => t.type === 'egreso' && t.date.startsWith(currentMonth)).length;
        
        if (incomeCountEl) incomeCountEl.textContent = `${incomeCount} transacciones`;
        if (expenseCountEl) expenseCountEl.textContent = `${expenseCount} transacciones`;

        // Update inventory count
        AdminInventorySystem.updateStats();

        // Update charts
        this.updateCharts(currentMonth);
    },

    updateCharts(month) {
        this.updateWeekChart(month);
        this.updateExpenseChart(month);
        this.updateDailyIncomeChart(month);
        this.updateCategoryExpenseChart(month);
    },

    updateWeekChart(month) {
        const ctx = document.getElementById('weekChart');
        if (!ctx) return;

        const today = new Date();
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().slice(0, 10));
        }

        const incomeData = last7Days.map(date => 
            FinanceSystem.transactions
                .filter(t => t.type === 'ingreso' && t.date === date)
                .reduce((sum, t) => sum + t.amount, 0)
        );
        
        const expenseData = last7Days.map(date =>
            FinanceSystem.transactions
                .filter(t => t.type === 'egreso' && t.date === date)
                .reduce((sum, t) => sum + t.amount, 0)
        );

        const labels = last7Days.map(d => new Date(d).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }));

        if (window.weekChartInstance) window.weekChartInstance.destroy();

        window.weekChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Ingresos',
                        data: incomeData,
                        backgroundColor: 'rgba(76, 175, 80, 0.7)',
                        borderColor: '#4CAF50',
                        borderWidth: 2
                    },
                    {
                        label: 'Egresos',
                        data: expenseData,
                        backgroundColor: 'rgba(244, 67, 54, 0.7)',
                        borderColor: '#F44336',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    },

    updateExpenseChart(month) {
        const ctx = document.getElementById('expenseChart');
        if (!ctx) return;

        const categories = ['Venta', 'Compra de Materiales', 'Servicios', 'Gastos Operativos', 'Otros'];
        const data = categories.map(cat =>
            FinanceSystem.transactions
                .filter(t => t.type === 'egreso' && t.category === cat && t.date.startsWith(month))
                .reduce((sum, t) => sum + t.amount, 0)
        );

        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

        if (window.expenseChartInstance) window.expenseChartInstance.destroy();

        window.expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: 'white',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    updateDailyIncomeChart(month) {
        const ctx = document.getElementById('dailyIncomeChart');
        if (!ctx) return;

        const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const dayLabels = Array.from({ length: days }, (_, i) => `${i + 1}`);
        
        const incomeData = dayLabels.map((day) => {
            const date = `${month}-${String(day).padStart(2, '0')}`;
            return FinanceSystem.transactions
                .filter(t => t.type === 'ingreso' && t.date === date)
                .reduce((sum, t) => sum + t.amount, 0);
        });

        if (window.dailyIncomeChartInstance) window.dailyIncomeChartInstance.destroy();

        window.dailyIncomeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Ingresos Diarios',
                    data: incomeData,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    },

    updateCategoryExpenseChart(month) {
        const ctx = document.getElementById('categoryExpenseChart');
        if (!ctx) return;

        const categories = ['Venta', 'Compra de Materiales', 'Servicios', 'Gastos Operativos', 'Otros'];
        const data = categories.map(cat =>
            FinanceSystem.transactions
                .filter(t => t.type === 'egreso' && t.category === cat && t.date.startsWith(month))
                .reduce((sum, t) => sum + t.amount, 0)
        );

        if (window.categoryExpenseChartInstance) window.categoryExpenseChartInstance.destroy();

        window.categoryExpenseChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Gastos',
                    data,
                    backgroundColor: 'rgba(244, 67, 54, 0.7)',
                    borderColor: '#F44336',
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
    }
};

// Exponer updateDashboard para actualizaciones externas
function updateFinanceDashboard() {
    FinanceUI.updateDashboard();
}

// =================== TAB SYSTEM ===================
const TabSystem = {
    init() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    },

    switchTab(tabName) {
        // Hide all content
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.remove('active');
        });

        // Remove active from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected content
        const tabContent = document.getElementById(tabName);
        if (tabContent) {
            tabContent.classList.add('active');
        }

        // Mark button as active
        event.target.classList.add('active');
    }
};

// =================== ADMIN INVENTORY SYSTEM ===================
const AdminInventorySystem = {
    async init() {
        await this.renderInventory();
        this.setupModal();
    },

    async updateStats() {
        const products = await AppSystem.getProducts();
        const inventoryCount = document.getElementById('inventory-count');
        if (inventoryCount) {
            const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
            inventoryCount.textContent = totalStock;
        }
    },

    async renderInventory() {
        const tbody = document.getElementById('inventory-list');
        if (!tbody) return;

        const products = await AppSystem.getProducts();
        tbody.innerHTML = '';
        const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

        products.forEach(p => {
            let statusBadge = '✅ En Stock';
            if (p.stock <= 5) statusBadge = '⚠️ Bajo Stock';
            if (p.stock === 0) statusBadge = '❌ Agotado';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${p.id}</td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td>${formatter.format(p.price)}</td>
                <td>${p.stock}</td>
                <td>${statusBadge}</td>
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
            AdminSystem.saveProduct();
        });
    }
};

// =================== ADMIN SYSTEM EXTENSION ===================
const AdminSystemExtended = {
    async editProduct(id) {
        const products = await AppSystem.getProducts();
        const product = products.find(p => p.id === id);
        if (product) {
            document.getElementById('prod-id').value = product.id;
            document.getElementById('prod-name').value = product.name;
            if (document.getElementById('prod-category')) {
                document.getElementById('prod-category').value = product.category;
            }
            document.getElementById('prod-desc').value = product.description;
            document.getElementById('prod-price').value = product.price;
            document.getElementById('prod-stock').value = product.stock;
            document.getElementById('prod-img').value = product.img;

            document.getElementById('modal-title').textContent = 'Editar Producto';
            document.getElementById('product-modal').classList.add('active');
        }
    },

    async saveProduct() {
        const idInput = document.getElementById('prod-id').value;
        const name = document.getElementById('prod-name').value;
        const category = document.getElementById('prod-category').value;
        const description = document.getElementById('prod-desc').value;
        const price = parseFloat(document.getElementById('prod-price').value);
        const stock = parseInt(document.getElementById('prod-stock').value);
        const img = document.getElementById('prod-img').value || '';

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
                AdminInventorySystem.renderInventory();
                alert('✅ Producto guardado exitosamente');
            } else {
                const data = await res.json();
                alert(data.error || 'Error al guardar producto');
            }
        } catch (err) {
            alert('Error de conexión con el servidor');
        }
    },

    async deleteProduct(id) {
        if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            try {
                const res = await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    AdminInventorySystem.renderInventory();
                    alert('✅ Producto eliminado');
                }
            } catch (err) {
                alert('Error de conexión con el servidor');
            }
        }
    }
};

// Override AdminSystem methods
AdminSystem.editProduct = AdminSystemExtended.editProduct;
AdminSystem.saveProduct = AdminSystemExtended.saveProduct;
AdminSystem.deleteProduct = AdminSystemExtended.deleteProduct;

// =================== INITIALIZE ON ADMIN PAGE ===================
const AdminPageInit = {
    async init() {
        if (!document.querySelector('.admin-page')) return;

        TabSystem.init();
        FinanceSystem.init();
        FinanceUI.updateDashboard();
        AdminInventorySystem.init();

        // Set today's date as default in transaction form
        const dateInput = document.getElementById('trans-date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }

        // Set current month in finance filter
        const financeMonth = document.getElementById('finance-month');
        if (financeMonth) {
            financeMonth.value = new Date().toISOString().slice(0, 7);
        }

        // Set current month in report filter
        const reportMonth = document.getElementById('report-month');
        if (reportMonth) {
            reportMonth.value = new Date().toISOString().slice(0, 7);
        }

        // Report generation
        const btnGenerateReport = document.getElementById('btn-generate-report');
        if (btnGenerateReport) {
            btnGenerateReport.addEventListener('click', () => {
                const month = document.getElementById('report-month').value;
                this.generateReport(month);
            });
        }
    },

    generateReport(month) {
        const income = FinanceSystem.getTotalIncome(month);
        const expense = FinanceSystem.getTotalExpense(month);
        const profit = income - expense;
        const margin = income > 0 ? ((profit / income) * 100).toFixed(1) : 0;

        document.getElementById('report-total-income').textContent = `$${income.toLocaleString('es-CO')}`;
        document.getElementById('report-total-expense').textContent = `$${expense.toLocaleString('es-CO')}`;
        document.getElementById('report-net-profit').textContent = `$${profit.toLocaleString('es-CO')}`;
        document.getElementById('report-margin').textContent = `${margin}%`;

        FinanceUI.updateCharts(month);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AdminPageInit.init();
});
