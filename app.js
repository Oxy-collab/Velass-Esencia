// =============================================
// Admin: Orders Management
// Injects "Pedidos" tab into the admin panel
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.admin-page')) return;

    // 1. Inject tab button
    const tabsContainer = document.querySelector('.admin-tabs') || document.querySelector('[class*="tab"]');
    const tabBtns = document.querySelectorAll('.admin-tab-btn, [data-tab], .inv-subtab-btn');

    // Find the tabs nav (the container with tab switching)
    const adminNav = document.querySelector('.admin-nav, .tabs-nav, nav.admin-tabs');

    // Inject via a safer method - find last tab button and insert after
    injectOrdersTab();
});

async function injectOrdersTab() {
    // Find the admin tabs container and the content area
    const allTabBtns = document.querySelectorAll('button[onclick*="showTab"], button[data-tab]');

    // Insert tab button into admin nav
    const navBtns = document.querySelectorAll('.admin-sidebar button, .tab-btn, button.admin-tab');
    const sidebar = document.querySelector('.admin-sidebar, .admin-tabs-container, .sidebar');

    // Universal approach: find a tab button that says "Inventario" or similar
    const inventoryBtn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent.includes('Inventario') || b.textContent.includes('inventario')
    );

    if (inventoryBtn && inventoryBtn.parentNode) {
        const ordersBtn = document.createElement('button');
        ordersBtn.className = inventoryBtn.className;
        ordersBtn.textContent = '📦 Pedidos';
        ordersBtn.setAttribute('data-orders-tab', 'true');

        // Copy the onclick behavior pattern
        const onclickAttr = inventoryBtn.getAttribute('onclick');
        if (onclickAttr) {
            ordersBtn.setAttribute('onclick', onclickAttr.replace(/\w+(?=\))/,
                (match) => match).replace(/'[^']*'/, "'orders'"));
        }

        ordersBtn.addEventListener('click', () => {
            // Deactivate all other tab buttons
            inventoryBtn.parentNode.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            ordersBtn.classList.add('active');
            showOrdersPanel();
        });

        inventoryBtn.parentNode.insertBefore(ordersBtn, inventoryBtn.nextSibling);
    }

    // Inject orders panel container
    const mainContent = document.querySelector('.admin-content, .admin-main, main');
    if (mainContent) {
        const ordersPanel = document.createElement('div');
        ordersPanel.id = 'admin-orders-panel';
        ordersPanel.style.display = 'none';
        ordersPanel.innerHTML = `
            <div class="admin-section">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
                    <h2>📦 Pedidos de clientes</h2>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        <select id="orders-filter" class="form-control status-select" onchange="filterOrders()">
                            <option value="">Todos los estados</option>
                            <option value="pendiente">⏳ Pendiente</option>
                            <option value="pagado">✅ Pagado</option>
                            <option value="en_preparacion">🕯️ En preparación</option>
                            <option value="enviado">🚚 Enviado</option>
                            <option value="entregado">🎉 Entregado</option>
                            <option value="cancelado">❌ Cancelado</option>
                        </select>
                        <button class="btn primary-btn sm" onclick="loadAdminOrders()">🔄 Actualizar</button>
                    </div>
                </div>
                <div id="admin-orders-list">
                    <div class="loading-spinner">Cargando pedidos...</div>
                </div>
            </div>
        `;
        mainContent.appendChild(ordersPanel);
    }
}

let allOrders = [];

async function showOrdersPanel() {
    // Hide all other sections
    document.querySelectorAll('.admin-section, .admin-tab-content, section.admin').forEach(el => {
        el.style.display = 'none';
    });
    const panel = document.getElementById('admin-orders-panel');
    if (panel) panel.style.display = 'block';
    await loadAdminOrders();
}

async function loadAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    if (!container) return;
    try {
        const res = await fetch('/api/orders');
        allOrders = await res.json();
        renderAdminOrders(allOrders);
    } catch (err) {
        container.innerHTML = '<p>Error cargando pedidos.</p>';
    }
}

function filterOrders() {
    const filter = document.getElementById('orders-filter').value;
    const filtered = filter ? allOrders.filter(o => o.status === filter) : allOrders;
    renderAdminOrders(filtered);
}

function renderAdminOrders(orders) {
    const container = document.getElementById('admin-orders-list');
    if (!container) return;
    const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    if (!orders.length) {
        container.innerHTML = '<div class="empty-state"><p>No hay pedidos con este filtro.</p></div>';
        return;
    }

    const statusLabels = { pendiente: '⏳ Pendiente', pagado: '✅ Pagado', en_preparacion: '🕯️ En preparación', enviado: '🚚 Enviado', entregado: '🎉 Entregado', cancelado: '❌ Cancelado' };

    container.innerHTML = `
        <div style="overflow-x:auto;">
        <table class="admin-orders-table">
            <thead>
                <tr>
                    <th>Referencia</th>
                    <th>Cliente</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Pago</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td><small>${order.wompi_reference}</small></td>
                        <td>
                            <strong>${order.user_name}</strong><br>
                            <small>${order.user_email}</small><br>
                            <small>📱 ${order.phone}</small>
                        </td>
                        <td>
                            ${(order.items || []).map(i => `<div style="font-size:0.82rem;">${i.product_name} ×${i.quantity}</div>`).join('')}
                        </td>
                        <td><strong>${formatter.format(order.total)}</strong></td>
                        <td><span class="order-status status-${order.payment_status === 'pagado' ? 'pagado' : 'pendiente'}">${order.payment_status}</span></td>
                        <td>
                            <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
                                ${['pendiente','pagado','en_preparacion','enviado','entregado','cancelado'].map(s =>
                                    `<option value="${s}" ${order.status === s ? 'selected' : ''}>${statusLabels[s]}</option>`
                                ).join('')}
                            </select>
                        </td>
                        <td><small>${new Date(order.created_at).toLocaleDateString('es-CO')}</small></td>
                        <td>
                            <a href="https://wa.me/57${order.phone.replace(/\D/g,'')}" target="_blank" 
                               class="btn primary-btn sm" title="Contactar cliente" style="padding:0.3rem 0.6rem;font-size:0.82rem;">
                               💬 WA
                            </a>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        </div>
    `;
}

async function updateOrderStatus(orderId, status) {
    try {
        await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (typeof CartSystem !== 'undefined') CartSystem.showToast('✅ Estado actualizado');
    } catch (err) {
        alert('Error actualizando estado.');
    }
}
