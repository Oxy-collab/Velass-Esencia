// ==========================================================
// Velass&Esencia - Toast Notification System (Emil Kowalski / Apple HIG)
// Non-blocking, accessible, fluid spring micro-interactions
// ==========================================================

(function (window) {
    'use strict';

    const ICONS = {
        success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
        error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E44AD" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F39C12" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    };

    function escapeHtml(val) {
        return String(val === null || val === undefined ? '' : val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensureContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            container.setAttribute('role', 'region');
            container.setAttribute('aria-label', 'Notificaciones');
            document.body.appendChild(container);
        }
        return container;
    }

    const Toast = {
        show(message, type = 'info', duration = 3800) {
            const container = ensureContainer();
            const normalizedType = ICONS[type] ? type : 'info';

            const toast = document.createElement('div');
            toast.className = `toast-item toast-${normalizedType}`;
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');

            const iconSpan = document.createElement('span');
            iconSpan.className = 'toast-icon';
            iconSpan.innerHTML = ICONS[normalizedType];

            const textSpan = document.createElement('span');
            textSpan.className = 'toast-message';
            textSpan.textContent = String(message || '');

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'toast-close-btn';
            closeBtn.setAttribute('aria-label', 'Cerrar notificación');
            closeBtn.innerHTML = '&times;';

            let timer = null;
            const removeToast = () => {
                if (timer) clearTimeout(timer);
                toast.classList.add('toast-exit');
                toast.addEventListener('animationend', () => {
                    toast.remove();
                }, { once: true });
                setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
            };

            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeToast();
            });

            toast.appendChild(iconSpan);
            toast.appendChild(textSpan);
            toast.appendChild(closeBtn);
            container.appendChild(toast);

            // Auto dismiss with pause on hover
            const startTimer = () => {
                if (duration > 0) {
                    timer = setTimeout(removeToast, duration);
                }
            };
            toast.addEventListener('mouseenter', () => { if (timer) clearTimeout(timer); });
            toast.addEventListener('mouseleave', () => { startTimer(); });

            startTimer();
            return toast;
        },

        success(msg, duration) { return this.show(msg, 'success', duration); },
        error(msg, duration) { return this.show(msg, 'error', duration); },
        info(msg, duration) { return this.show(msg, 'info', duration); },
        warning(msg, duration) { return this.show(msg, 'warning', duration); }
    };

    window.Toast = Toast;
})(typeof window !== 'undefined' ? window : this);

