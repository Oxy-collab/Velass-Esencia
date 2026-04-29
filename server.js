<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Velass&Esencia - Pedido Confirmado</title>
    <link rel="stylesheet" href="css/styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
</head>
<body>
    <header class="navbar">
        <button id="theme-toggle" class="theme-btn">
            <svg id="moon-icon" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        </button>
        <div class="logo-container">
            <img src="https://cdn.phototourl.com/free/2026-03-25-86eb837e-6f5a-4227-a92e-9e78d32f9aa2.png" alt="Velass&Esencia Logo" class="logo-img">
        </div>
        <nav><a href="index.html">Catálogo</a></nav>
    </header>

    <main class="confirmation-page">
        <div class="confirmation-card" id="confirmation-content">
            <div class="confirmation-icon success" id="conf-icon">🎉</div>
            <h1 id="conf-title">¡Pedido recibido!</h1>
            <p id="conf-message">Tu pago fue procesado exitosamente. Pronto nos pondremos en contacto contigo para coordinar el envío.</p>
            <div class="conf-reference" id="conf-ref"></div>
            <div class="confirmation-actions">
                <a href="dashboard.html" class="btn primary-btn">Ver mis pedidos</a>
                <a href="index.html" class="btn secondary-btn">Seguir comprando</a>
            </div>
            <div class="whatsapp-followup">
                <p>¿Tienes preguntas sobre tu pedido?</p>
                <a href="https://wa.me/573005798487" target="_blank" class="btn whatsapp-btn">
                    <svg viewBox="0 0 32 32" width="20" height="20" fill="white"><path d="M16 2a13 13 0 0 0-11 20l-2 7 7-2a13 13 0 1 0 6-25z"/></svg>
                    Escríbenos por WhatsApp
                </a>
            </div>
        </div>
    </main>

    <script src="js/app.js"></script>
    <script src="js/cart.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            CartSystem.init();
            ThemeSystem.init();
            const params = new URLSearchParams(window.location.search);
            const ref = params.get('ref');
            const status = params.get('status');
            const refEl = document.getElementById('conf-ref');
            if (ref && refEl) refEl.innerHTML = `<span>Referencia:</span> <strong>${ref}</strong>`;

            if (status === 'approved') {
                CartSystem.clearCart();
                document.getElementById('conf-icon').textContent = '🎉';
                document.getElementById('conf-title').textContent = '¡Pago aprobado!';
                document.getElementById('conf-message').textContent = 'Tu pedido está confirmado. Nuestro equipo comenzará a prepararlo con amor. Te contactaremos para coordinar el envío.';
            } else {
                document.getElementById('conf-icon').textContent = '⏳';
                document.getElementById('conf-title').textContent = 'Pedido en revisión';
                document.getElementById('conf-message').textContent = 'Estamos verificando tu pago. Te notificaremos cuando sea confirmado.';
            }
        });
    </script>
</body>
</html>
