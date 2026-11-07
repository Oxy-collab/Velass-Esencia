// Velass&Esencia - Zero-flash theme initialization (UX-3, Apple HIG)
// Synchronously sets data-theme on documentElement before body paint
(function () {
    try {
        var saved = localStorage.getItem('theme');
        var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = saved ? saved : (systemDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
    } catch (e) { }
})();

