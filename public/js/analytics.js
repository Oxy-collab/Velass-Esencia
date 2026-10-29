// ==========================================================================
// Velass&Esencia - Módulo de Analítica y Consentimiento (GA4 + Meta Pixel)
// Cumple con Google Consent Mode v2 y permite medir sin romper la privacidad.
// ==========================================================================

(function (window, document) {
    'use strict';

    const CONSENT_KEY = 'va_consent'; // 'granted' | 'denied'
    const DEFAULT_GA_ID = 'G-17KGKVB85Z';

    // Determina si debemos habilitar debug_mode para DebugView en GA4
    const isDebug = Boolean(
        (window.location && window.location.search && window.location.search.includes('debug')) ||
        (window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    );

    // Inicializa la cola dataLayer / gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }
    window.gtag = window.gtag || gtag;

    // Estado del módulo
    const state = {
        gaId: DEFAULT_GA_ID,
        metaPixelId: '',
        consent: null, // null | 'granted' | 'denied'
        scriptInjected: false,
        initialized: false
    };

    // --- GOOGLE CONSENT MODE v2: configuración por defecto ---
    // Hasta que el usuario acepte, el almacenamiento analítico y publicitario queda denegado.
    function initConsentDefaults() {
        try {
            state.consent = window.localStorage ? window.localStorage.getItem(CONSENT_KEY) : null;
        } catch (e) {
            state.consent = null;
        }

        const isGranted = state.consent === 'granted';
        gtag('consent', 'default', {
            analytics_storage: isGranted ? 'granted' : 'denied',
            ad_storage: isGranted ? 'granted' : 'denied',
            ad_user_data: isGranted ? 'granted' : 'denied',
            ad_personalization: isGranted ? 'granted' : 'denied',
            wait_for_update: 500
        });
    }

    // Inyecta el script de Google Analytics una sola vez si hay consentimiento
    function injectGAScript(id) {
        if (!id || state.scriptInjected) return;
        state.scriptInjected = true;

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
        script.onerror = function () {
            // Silencioso si hay un adblocker activo
        };
        document.head.appendChild(script);

        gtag('js', new Date());
        const configOptions = {
            send_page_view: true
        };
        if (isDebug) {
            configOptions.debug_mode = true;
        }
        gtag('config', id, configOptions);

        if (isDebug) {
            console.log(`[Analytics] GA4 inicializado con ${id} (debug_mode: true)`);
        }
    }

    // Actualiza el consentimiento tras la interacción del usuario
    function setConsent(decision) {
        const valid = decision === 'granted' ? 'granted' : 'denied';
        state.consent = valid;
        try {
            if (window.localStorage) {
                window.localStorage.setItem(CONSENT_KEY, valid);
            }
        } catch (e) { /* modo incógnito */ }

        gtag('consent', 'update', {
            analytics_storage: valid,
            ad_storage: valid,
            ad_user_data: valid,
            ad_personalization: valid
        });

        if (valid === 'granted') {
            injectGAScript(state.gaId);
            // Notifica evento de consentimiento otorgado
            Analytics.track('consent_granted', { method: 'banner' });
        }

        hideBanner();
    }

    // --- BANNER DE COOKIES / CONSENTIMIENTO ---
    function renderBanner() {
        if (document.getElementById('cookie-consent-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Aviso de cookies y privacidad');

        banner.innerHTML = `
            <div class="cookie-banner-content">
                <span class="cookie-banner-icon" aria-hidden="true">🕯️</span>
                <p class="cookie-banner-text">
                    En <strong>Velass&amp;Esencia</strong> usamos cookies analíticas para entender qué velas te inspiran más y mejorar tu experiencia. ¿Aceptas su uso?
                </p>
                <div class="cookie-banner-actions">
                    <button type="button" id="cookie-reject-btn" class="btn cookie-btn cookie-btn-secondary">Rechazar</button>
                    <button type="button" id="cookie-accept-btn" class="btn cookie-btn cookie-btn-primary">Aceptar</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        const acceptBtn = document.getElementById('cookie-accept-btn');
        const rejectBtn = document.getElementById('cookie-reject-btn');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => setConsent('granted'));
        }
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => setConsent('denied'));
        }
    }

    function hideBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.classList.add('cookie-banner-hidden');
            setTimeout(() => {
                if (banner.parentNode) banner.parentNode.removeChild(banner);
            }, 300);
        }
    }

    function openConsentBanner() {
        const existing = document.getElementById('cookie-consent-banner');
        if (existing) {
            existing.classList.remove('cookie-banner-hidden');
            return;
        }
        renderBanner();
    }

    // --- SEGUIMIENTO DE EVENTOS ---
    const Analytics = {
        get gaId() {
            return state.gaId;
        },
        get consent() {
            return state.consent;
        },
        setConsent,
        openConsentBanner,

        track(eventName, params) {
            try {
                const payload = Object.assign({}, params || {});
                if (isDebug) {
                    payload.debug_mode = true;
                    console.log(`[Analytics] Evento: "${eventName}"`, payload);
                }
                gtag('event', eventName, payload);
            } catch (err) {
                // Silencioso para nunca romper la tienda
            }
        },

        // 1. view_item: visualización de vela (modal o ficha completa)
        trackViewItem(product) {
            if (!product) return;
            const price = Number(product.price) || 0;
            this.track('view_item', {
                currency: 'COP',
                value: price,
                items: [{
                    item_id: String(product.id || product.slug || ''),
                    item_name: String(product.name || ''),
                    item_category: String(product.category || ''),
                    price: price,
                    quantity: 1
                }]
            });
        },

        // 2. add_to_cart: añadir al carrito
        trackAddToCart(product, qty) {
            if (!product) return;
            const quantity = Number(qty) || 1;
            const price = Number(product.price) || 0;
            this.track('add_to_cart', {
                currency: 'COP',
                value: price * quantity,
                items: [{
                    item_id: String(product.id || product.slug || ''),
                    item_name: String(product.name || ''),
                    item_category: String(product.category || ''),
                    price: price,
                    quantity: quantity
                }]
            });
        },

        // 3. order_intent: clic a WhatsApp para pedir (conversión principal)
        trackOrderIntent(detail) {
            const data = detail || {};
            const message = String(data.message || '');
            const payload = {
                currency: 'COP',
                method: 'whatsapp',
                message_length: message.length
            };
            if (data.value && Number.isFinite(Number(data.value))) {
                payload.value = Number(data.value);
            }
            if (data.items && Array.isArray(data.items)) {
                payload.items = data.items.map((item) => ({
                    item_id: String(item.id || ''),
                    item_name: String(item.name || ''),
                    price: Number(item.price) || 0,
                    quantity: Number(item.qty || item.quantity || 1)
                }));
            }
            this.track('order_intent', payload);
        },

        // 4. finish_test: finalización del test de la vela ideal
        trackFinishTest(detail) {
            const data = detail || {};
            this.track('finish_test', {
                result_key: String(data.resultKey || data.result_key || ''),
                result_title: String(data.resultTitle || data.result_title || ''),
                answers_count: Array.isArray(data.answers) ? data.answers.length : 4
            });
        },

        async init() {
            if (state.initialized) return;
            state.initialized = true;

            initConsentDefaults();

            // Cargar el ID de medición configurado desde la API o valor por defecto
            try {
                const res = await fetch('/api/settings/ga_measurement_id');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.value && data.value.trim()) {
                        state.gaId = data.value.trim();
                    }
                }
            } catch (e) {
                // Si la API falla, usamos el DEFAULT_GA_ID
            }

            // Si el usuario ya aceptó las cookies previamente, inyectamos GA4 directamente
            if (state.consent === 'granted') {
                injectGAScript(state.gaId);
            } else if (state.consent === null) {
                // Si aún no ha decidido, mostramos el banner
                renderBanner();
            }

            this.bindEvents();
        },

        bindEvents() {
            // Escuchar eventos desacoplados emitidos por la aplicación
            window.addEventListener('view_item', (e) => {
                if (e.detail && (e.detail.product || e.detail.id)) {
                    this.trackViewItem(e.detail.product || e.detail);
                }
            });

            window.addEventListener('add_to_cart', (e) => {
                if (e.detail) {
                    this.trackAddToCart(e.detail.product || e.detail, e.detail.qty || 1);
                }
            });

            window.addEventListener('order_intent', (e) => {
                this.trackOrderIntent(e.detail);
            });

            window.addEventListener('finish_test', (e) => {
                this.trackFinishTest(e.detail);
            });

            // Enlace de preferencias de cookies en el footer
            const cookieBtn = document.getElementById('cookie-settings-btn');
            if (cookieBtn) {
                cookieBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openConsentBanner();
                });
            }

            // Detección automática en páginas renderizadas en servidor (/producto/<slug>)
            const productPageEl = document.querySelector('.product-page[data-product-id]');
            if (productPageEl) {
                const id = productPageEl.dataset.productId;
                const name = productPageEl.dataset.productName;
                const category = productPageEl.dataset.productCategory;
                const price = Number(productPageEl.dataset.productPrice) || 0;
                this.trackViewItem({ id, name, category, price });

                const cta = productPageEl.querySelector('.product-page-cta');
                if (cta) {
                    cta.addEventListener('click', () => {
                        this.trackOrderIntent({
                            method: 'whatsapp',
                            value: price,
                            items: [{ id, name, price, qty: 1 }]
                        });
                    });
                }
            }

            // Detección del botón flotante de WhatsApp en la portada
            const floatBtn = document.getElementById('whatsapp-float');
            if (floatBtn) {
                floatBtn.addEventListener('click', () => {
                    this.trackOrderIntent({ method: 'whatsapp_float' });
                });
            }
        }
    };

    window.Analytics = Analytics;

    // Auto-arranque al cargar el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Analytics.init());
    } else {
        Analytics.init();
    }
})(window, document);
