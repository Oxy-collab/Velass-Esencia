// Respaldo en cliente para el panel: el servidor ya bloquea /admin.html sin sesión admin.
fetch('/api/me', { credentials: 'same-origin' })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('sin sesión'))))
    .then((user) => {
        if (!user || user.role !== 'admin') throw new Error('sin permisos');
        try { localStorage.setItem('currentUser', JSON.stringify(user)); } catch (e) { /* modo privado */ }
    })
    .catch(() => { window.location.href = '/login.html?next=admin.html'; });
