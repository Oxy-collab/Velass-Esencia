:root {
    --primary-color: #8E44AD; /* Deep Purple */
    --secondary-color: #D2B4DE; /* Lilac */
    --accent-color: #F5EEF8; /* Soft Lilac */
    --background: #d9cde9; /* User requested hex */
    --text-color: #4A235A; /* Dark purple text */
    --card-bg: rgba(255, 255, 255, 0.85);
    --shadow: 0 8px 32px rgba(142, 68, 173, 0.08);
    --border-radius: 16px;
    --transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    --nav-bg: rgba(255, 255, 255, 0.95);
    --input-bg: rgba(255, 255, 255, 0.6);
    --input-border: #ddd;
    --footer-bg: white;
}

[data-theme="dark"] {
    --primary-color: #c39bd3;
    --secondary-color: #7d3c98;
    --background: #2c1e38;
    --text-color: #f4ecf7;
    --card-bg: rgba(30, 20, 40, 0.9);
    --shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    --nav-bg: rgba(30, 20, 40, 0.95);
    --input-bg: rgba(40, 30, 50, 0.8);
    --input-border: #555;
    --footer-bg: rgba(30, 20, 40, 1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Outfit', sans-serif;
}

body {
    background-color: var(--background);
    color: var(--text-color);
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Typography */
h1, h2, h3 { color: var(--text-color); font-weight: 600; }
a { text-decoration: none; color: var(--primary-color); transition: var(--transition); }
a:hover { color: #e08297; }

/* Navbar */
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 5%;
    background: var(--nav-bg);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
    position: sticky;
    top: 0;
    z-index: 100;
}

.logo {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--primary-color);
    letter-spacing: 1px;
}

.theme-btn {
    background: transparent;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
}

.theme-btn:hover {
    background: rgba(142, 68, 173, 0.1);
    transform: rotate(15deg);
}

[data-theme="dark"] .theme-btn {
    color: #f1c40f; 
}

.navbar nav a {
    margin-left: 2rem;
    color: var(--text-color);
    font-weight: 400;
}

.navbar nav a.active, .navbar nav a:hover {
    color: var(--primary-color);
    border-bottom: 2px solid var(--primary-color);
    padding-bottom: 5px;
}

/* Buttons */
.btn {
    padding: 0.8rem 1.5rem;
    border: none;
    border-radius: 30px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
}

.primary-btn { background: var(--primary-color); color: white; }
.primary-btn:hover { background: #e88fa2; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(252, 163, 183, 0.4); }

.secondary-btn { background: var(--secondary-color); color: #2c5e4a; }
.secondary-btn:hover { background: #88cfae; transform: translateY(-2px); }

.text-btn { background: transparent; color: var(--text-color); }
.text-btn:hover { background: #f0f0f0; }

/* Forms */
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-color); opacity: 0.8;}
.form-group input, .form-group textarea, .form-group select {
    width: 100%;
    padding: 0.8rem;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    font-size: 1rem;
    color: var(--text-color);
    transition: var(--transition);
    background: var(--input-bg);
}
.form-group input:focus, .form-group textarea:focus, .form-group select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(142, 68, 173, 0.2);
    background: var(--card-bg);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-group.full {
    grid-column: 1 / -1;
}

.form-control {
    padding: 0.6rem;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    background: var(--input-bg);
    color: var(--text-color);
}

/* Layout */
main { flex: 1; padding: 2rem 5%; }

/* Hero Section */
.hero {
    text-align: center;
    padding: 5rem 2rem;
    background: linear-gradient(135deg, rgba(210, 180, 222, 0.4) 0%, rgba(245, 238, 248, 0.6) 100%);
    border-radius: var(--border-radius);
    margin-bottom: 4rem;
    animation: fadeIn 1s ease-out;
}
.hero h1 { font-size: 2.8rem; margin-bottom: 1rem; color: var(--text-color); }
.hero p { font-size: 1.2rem; color: var(--text-color); opacity: 0.8; max-width: 600px; margin: 0 auto; }

/* Product Grid */
.product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
}
.product-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    overflow: hidden;
    box-shadow: var(--shadow);
    transition: var(--transition);
    animation: fadeUp 0.6s ease-out backwards;
}
.product-card:hover { transform: translateY(-10px); box-shadow: 0 15px 40px rgba(0,0,0,0.1); }
.product-img { height: 200px; background-color: #f0f0f0; background-size: cover; background-position: center; }
.product-info { padding: 1.5rem; }
.product-title { font-size: 1.25rem; margin-bottom: 0.5rem; }
.product-desc { color: var(--text-color); opacity: 0.8; font-size: 0.9rem; margin-bottom: 1rem; height: 40px; overflow: hidden; text-overflow: ellipsis; }
.product-footer { display: flex; justify-content: space-between; align-items: center; }
.product-price { font-weight: 600; color: var(--primary-color); font-size: 1.2rem; }

/* Auth Pages */
.auth-container { display: flex; justify-content: center; align-items: center; min-height: 70vh; }
.auth-card {
    background: var(--card-bg);
    padding: 3rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    width: 100%;
    max-width: 450px;
    animation: fadeUp 0.5s ease-out;
}
.auth-card h2 { text-align: center; margin-bottom: 2rem; }
.auth-card button { width: 100%; margin-top: 1rem; }
.toggle-auth { text-align: center; margin-top: 1.5rem; font-size: 0.9rem; }

/* =================== ADMIN DASHBOARD =================== */
.admin-container { max-width: 1400px; margin: 0 auto; }

/* Admin Tabs */
.admin-tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid var(--input-border);
    flex-wrap: wrap;
}

.tab-btn {
    background: transparent;
    border: none;
    padding: 1rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-color);
    border-bottom: 3px solid transparent;
    transition: var(--transition);
}

.tab-btn:hover {
    color: var(--primary-color);
    background: rgba(142, 68, 173, 0.05);
}

.tab-btn.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
}

/* Tab Content */
.tab-content {
    display: none;
    animation: fadeIn 0.3s ease-out;
}

.tab-content.active {
    display: block;
}

/* Dashboard */
.dashboard { margin-bottom: 3rem; }
.stats-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
    gap: 1.5rem; 
    margin-top: 1.5rem; 
}
.stat-card {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    border-left: 5px solid var(--secondary-color);
    transition: var(--transition);
}
.stat-card:hover { transform: translateY(-5px); }
.stat-card.success { border-left-color: #4CAF50; }
.stat-card.danger { border-left-color: #F44336; }
.stat-card.primary { border-left-color: #2196F3; }

.stat-card h3 { font-size: 0.95rem; color: #999; margin-bottom: 0.5rem; text-transform: uppercase; }
.stat-value { font-size: 2.5rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.5rem; }
.stat-detail { font-size: 0.9rem; color: #999; }

/* Charts Section */
.chart-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
}

.chart-container {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
}

.chart-container h3 {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
}

.chart-container canvas {
    max-height: 300px;
}

/* Finance Section */
.finance-section { padding: 1.5rem 0; }

.finance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.date-filter input {
    padding: 0.6rem 1rem;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    background: var(--input-bg);
    color: var(--text-color);
}

.transaction-form-container {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    margin-bottom: 2rem;
}

.transaction-form-container h3 {
    margin-bottom: 1.5rem;
}

.transaction-form .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.transaction-form .form-group.full {
    grid-column: 1 / -1;
}

/* Transactions List */
.transactions-container {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
}

.transactions-container h3 {
    margin-bottom: 1.5rem;
}

.transactions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.transaction-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.5);
    border-left: 4px solid #999;
    border-radius: 8px;
    transition: var(--transition);
}

.transaction-item.ingreso {
    border-left-color: #4CAF50;
    background: rgba(76, 175, 80, 0.05);
}

.transaction-item.egreso {
    border-left-color: #F44336;
    background: rgba(244, 67, 54, 0.05);
}

.transaction-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateX(4px);
}

.trans-left {
    display: flex;
    gap: 1rem;
    flex: 1;
}

.trans-icon {
    font-size: 2rem;
    width: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.trans-details {
    flex: 1;
}

.trans-category {
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.trans-desc {
    font-size: 0.9rem;
    color: #999;
    margin-bottom: 0.25rem;
}

.trans-date {
    font-size: 0.85rem;
    color: #bbb;
}

.trans-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.trans-amount {
    font-weight: 700;
    font-size: 1.1rem;
    min-width: 120px;
    text-align: right;
}

.trans-amount.ingreso {
    color: #4CAF50;
}

.trans-amount.egreso {
    color: #F44336;
}

.btn-delete-trans {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    transition: var(--transition);
}

.btn-delete-trans:hover {
    transform: scale(1.2);
}

/* Admin Dashboard */
.dashboard { margin-bottom: 3rem; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
.stat-card {
    background: var(--card-bg);
    padding: 1.5rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    border-left: 5px solid var(--secondary-color);
}
.stat-card h3 { font-size: 1rem; color: #666; margin-bottom: 0.5rem; }
.stat-value { font-size: 2rem; font-weight: 600; color: var(--primary-color); }
.inventory-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.inventory-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--card-bg);
    border-radius: var(--border-radius);
    overflow: hidden;
    box-shadow: var(--shadow);
}
.inventory-table th, .inventory-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #eee; }
.inventory-table th { background: var(--input-bg); color: var(--text-color); }
.inventory-table tr:hover { opacity: 0.9; background: rgba(142, 68, 173, 0.05); }
.action-btn { padding: 0.4rem 0.8rem; border-radius: 20px; border: none; cursor: pointer; font-size: 0.8rem; margin-right: 0.5rem; }
.edit-btn { background: #ffd3b6; color: #b0622a; }
.del-btn { background: #ffb3b3; color: #a02020; }

/* Reports Section */
.reports-section { padding: 1.5rem 0; }

.report-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.report-filters input {
    padding: 0.6rem 1rem;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    background: var(--input-bg);
    color: var(--text-color);
}

.reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
}

.report-summary {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
}

.report-summary h3 {
    margin-bottom: 1.5rem;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
}

.summary-item {
    background: rgba(142, 68, 173, 0.05);
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid var(--primary-color);
}

.summary-label {
    display: block;
    font-size: 0.9rem;
    color: #999;
    margin-bottom: 0.5rem;
}

.summary-value {
    display: block;
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--primary-color);
}

.summary-value.success {
    color: #4CAF50;
}

/* Modal */
.modal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
}
.modal-overlay.active { display: flex; }
.modal-card {
    background: var(--card-bg);
    padding: 2.5rem;
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 500px;
    animation: scaleIn 0.3s ease-out;
    max-height: 90vh;
    overflow-y: auto;
}
.modal-card h3 { margin-bottom: 1.5rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }

/* Animations */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

/* Custom Candle Section */
.custom-candle {
    background: var(--card-bg);
    padding: 3rem 2rem;
    border-radius: var(--border-radius);
    box-shadow: 0 4px 20px rgba(142, 68, 173, 0.1);
    margin-top: 4rem;
    margin-bottom: 2rem;
    border: 1px solid rgba(142, 68, 173, 0.3);
}

.custom-candle h2 {
    text-align: center;
    color: var(--primary-color);
    margin-bottom: 1rem;
}

.custom-form {
    max-width: 500px;
    margin: 0 auto;
    background: var(--card-bg);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: var(--shadow);
}

.site-footer {
    text-align: center;
    padding: 3rem 2rem;
    background: var(--footer-bg);
    box-shadow: 0 -5px 20px rgba(0,0,0,0.02);
    margin-top: auto;
}

.social-links {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
}

.social-links a {
    color: var(--text-color);
    background: var(--input-bg);
    width: 45px;
    height: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: var(--transition);
}

.social-links a:hover {
    background: var(--primary-color);
    color: white;
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(252, 163, 183, 0.4);
}

.site-footer p {
    color: #888;
    font-size: 0.9rem;
}

/* WhatsApp Float */
.whatsapp-float {
    position: fixed;
    bottom: 30px;
    right: 30px;
    background-color: #25d366;
    color: white;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);
    z-index: 1000;
    transition: var(--transition);
    animation: bounce 2s infinite;
}

.whatsapp-float:hover {
    transform: scale(1.1);
    background-color: #1ebe5d;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
}

/* Our Story Section */
.our-story {
    background: var(--card-bg);
    padding: 4rem 2rem;
    margin: 3rem 0;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    text-align: center;
}

.our-story h2 {
    color: var(--primary-color);
    margin-bottom: 2rem;
    font-size: 2rem;
}

.story-content {
    max-width: 800px;
    margin: 0 auto;
    font-size: 1.1rem;
    color: var(--text-color);
    opacity: 0.9;
    line-height: 1.8;
    position: relative;
    padding: 2rem;
    z-index: 1;
}

/* Scroll Reveal Animations */
.reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.8s ease-out;
}

.reveal.active {
    opacity: 1;
    transform: translateY(0);
}

/* Utilities */
.product-card:nth-child(1) { animation-delay: 0.1s; }
.product-card:nth-child(2) { animation-delay: 0.2s; }
.product-card:nth-child(3) { animation-delay: 0.3s; }
.product-card:nth-child(4) { animation-delay: 0.4s; }

/* Responsive tweaks */
@media (max-width: 768px) {
    .inventory-table { display: block; overflow-x: auto; }
    .admin-tabs { flex-direction: column; }
    .tab-btn { padding: 0.8rem 1rem; }
    .form-row { grid-template-columns: 1fr; }
    .chart-section { grid-template-columns: 1fr; }
    .reports-grid { grid-template-columns: 1fr; }
    .transaction-item { flex-direction: column; align-items: flex-start; }
    .trans-right { width: 100%; margin-top: 1rem; justify-content: space-between; }
    .stats-grid { grid-template-columns: 1fr; }
}

/* Category grid and logo extra styles */
.logo-img {
    height: 120px;
    width: 120px;
    max-width: 100%;
    object-fit: contain;
    border-radius: 50%;
}

.category-section {
    margin-bottom: 3rem;
}

.category-title {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    color: var(--primary-color);
    border-bottom: 2px solid var(--secondary-color);
    padding-bottom: 0.5rem;
    display: inline-block;
}

.catalog-footer-msg {
    text-align: center;
    margin-top: 3rem;
    font-size: 1.2rem;
    color: var(--primary-color);
    font-weight: 600;
}

/* =================== SOCIAL FEED SECTION =================== */
.social-feed {
    margin: 4rem 0 2rem;
    padding: 3rem 2rem;
    background: var(--card-bg);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
}

.social-feed-header {
    text-align: center;
    margin-bottom: 2.5rem;
}

.social-feed-header h2 {
    font-size: 2rem;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}

.social-feed-header p {
    color: var(--text-color);
    opacity: 0.7;
    font-size: 1rem;
}

.social-feed-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5rem;
    align-items: start;
}

.social-feed-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.social-feed-col-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    width: 100%;
    justify-content: center;
}

.social-feed-col-header h3 {
    font-size: 1.1rem;
    color: var(--text-color);
    margin: 0;
}

.social-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.9rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.social-badge.tiktok {
    background: linear-gradient(135deg, #010101 0%, #69C9D0 50%, #EE1D52 100%);
    color: white;
}

.social-badge.instagram {
    background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
    color: white;
}

.social-embed-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    min-height: 500px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--input-bg);
    position: relative;
}

.social-embed-wrapper iframe,
.social-embed-wrapper blockquote {
    max-width: 100% !important;
    width: 100% !important;
}

.social-follow-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.5rem;
    border-radius: 30px;
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    transition: var(--transition);
    color: white;
}

.social-follow-btn.tiktok {
    background: #010101;
    border: 1px solid #69C9D0;
}

.social-follow-btn.tiktok:hover {
    background: #1a1a1a;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(105, 201, 208, 0.4);
    color: white;
}

.social-follow-btn.instagram {
    background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
}

.social-follow-btn.instagram:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(253, 29, 29, 0.4);
    color: white;
}

@media (max-width: 768px) {
    .social-feed-grid {
        grid-template-columns: 1fr;
        gap: 3rem;
    }
}

/* =================== TOAST NOTIFICATIONS =================== */
.toast-container {
    position: fixed;
    top: 90px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    pointer-events: none;
}

.toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    background: var(--card-bg);
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-color);
    animation: toastIn 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
    pointer-events: all;
    backdrop-filter: blur(12px);
    border-left: 4px solid var(--primary-color);
    max-width: 360px;
}

.toast.success { border-left-color: #4CAF50; }
.toast.error   { border-left-color: #F44336; }
.toast.info    { border-left-color: #2196F3; }

.toast-icon { font-size: 1.3rem; }

.toast.hide {
    animation: toastOut 0.3s ease forwards;
}

@keyframes toastIn {
    from { opacity: 0; transform: translateX(60px); }
    to   { opacity: 1; transform: translateX(0); }
}

@keyframes toastOut {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(60px); }
}

/* =================== ADMIN IMPROVEMENTS =================== */
/* Monthly trend chart */
.chart-full-row {
    grid-column: 1 / -1;
}

/* Admin Social Tab */
.social-admin-section {
    padding: 1.5rem 0;
}

.social-admin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 2rem;
}

.social-admin-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: var(--shadow);
}

.social-admin-card h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
}

.social-admin-card .form-group {
    margin-bottom: 1rem;
}

.social-preview-mini {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--input-border);
    text-align: center;
    min-height: 80px;
}

.social-preview-mini p {
    font-size: 0.85rem;
    color: #999;
    margin-bottom: 0.75rem;
}

/* KPI trend indicator */
.stat-trend {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    margin-top: 0.4rem;
}

.stat-trend.up   { background: rgba(76, 175, 80, 0.15); color: #4CAF50; }
.stat-trend.down { background: rgba(244, 67, 54, 0.15); color: #F44336; }
.stat-trend.flat { background: rgba(158, 158, 158, 0.15); color: #999; }

/* Improved stat card */
.stat-card {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    border-left: 5px solid var(--secondary-color);
    transition: var(--transition);
    display: flex;
    flex-direction: column;
}

.stat-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.12); }
.stat-card.success { border-left-color: #4CAF50; }
.stat-card.danger  { border-left-color: #F44336; }
.stat-card.primary { border-left-color: #2196F3; }

[data-theme="dark"] .stat-card h3 { color: #bbb; }
[data-theme="dark"] .trans-desc   { color: #bbb; }
[data-theme="dark"] .trans-date   { color: #888; }
[data-theme="dark"] .summary-label { color: #bbb; }
[data-theme="dark"] .stat-detail  { color: #aaa; }

/* Dark mode table borders */
[data-theme="dark"] .inventory-table th,
[data-theme="dark"] .inventory-table td {
    border-bottom-color: rgba(255,255,255,0.07);
}

[data-theme="dark"] .inventory-table th {
    background: rgba(255,255,255,0.05);
}

[data-theme="dark"] .transaction-item {
    background: rgba(255,255,255,0.04);
}

[data-theme="dark"] .transaction-item.ingreso {
    background: rgba(76, 175, 80, 0.08);
}

[data-theme="dark"] .transaction-item.egreso {
    background: rgba(244, 67, 54, 0.08);
}

[data-theme="dark"] .text-btn:hover {
    background: rgba(255,255,255,0.08);
}

[data-theme="dark"] .summary-item {
    background: rgba(195, 155, 211, 0.1);
}

@media (max-width: 768px) {
    .social-admin-grid { grid-template-columns: 1fr; }
    .chart-section { grid-template-columns: 1fr; }
}

/* =================== INVENTORY SUB-TABS =================== */
.inv-subtabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    background: var(--input-bg);
    padding: 0.4rem;
    border-radius: 12px;
    width: fit-content;
}

.inv-subtab-btn {
    background: transparent;
    border: none;
    padding: 0.6rem 1.4rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-color);
    border-radius: 8px;
    transition: var(--transition);
    font-family: 'Outfit', sans-serif;
}

.inv-subtab-btn:hover {
    background: rgba(142, 68, 173, 0.1);
    color: var(--primary-color);
}

.inv-subtab-btn.active {
    background: var(--primary-color);
    color: white;
    box-shadow: 0 4px 12px rgba(142, 68, 173, 0.3);
}

.inv-subtab-content {
    display: none;
    animation: fadeIn 0.3s ease-out;
}

.inv-subtab-content.active {
    display: block;
}

/* =================== RAW MATERIALS =================== */
.materials-alert-box {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background: rgba(244, 67, 54, 0.08);
    border: 1px solid rgba(244, 67, 54, 0.25);
    border-radius: 10px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    color: var(--text-color);
}

.mat-alert-badge {
    background: rgba(244, 67, 54, 0.15);
    color: #F44336;
    padding: 0.25rem 0.7rem;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 600;
}

.mat-summary-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
}

.mat-summary-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--card-bg);
    border: 1px solid var(--input-border);
    padding: 0.5rem 1rem;
    border-radius: 30px;
    font-size: 0.9rem;
    box-shadow: var(--shadow);
}

.mat-summary-chip strong {
    background: var(--primary-color);
    color: white;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
}

/* Status badges in materials table */
.mat-status {
    display: inline-block;
    padding: 0.25rem 0.7rem;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 600;
}

.mat-status.ok      { background: rgba(76,175,80,0.12);  color: #4CAF50; }
.mat-status.bajo    { background: rgba(255,152,0,0.12);  color: #FF9800; }
.mat-status.agotado { background: rgba(244,67,54,0.12);  color: #F44336; }

.mat-qty { font-weight: 700; }
.mat-qty.qty-low    { color: #F44336; }

[data-theme="dark"] .inv-subtab-btn { color: var(--text-color); }
[data-theme="dark"] .materials-alert-box { border-color: rgba(244,67,54,0.3); }

/* =============================================
   CART, CHECKOUT, DASHBOARD - NEW STYLES
   Compatible with light & dark mode
   ============================================= */

/* Cart Badge on nav */
.nav-cart-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 600;
    padding: 0.4rem 0.9rem;
    background: var(--primary-color);
    color: white !important;
    border-radius: 20px;
    transition: var(--transition);
}
.nav-cart-btn:hover { background: #a25bc4; transform: translateY(-1px); border-bottom: none !important; }
.cart-badge {
    background: #e74c3c;
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 2px;
}

/* Cart Toast Notification */
#cart-toast {
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--primary-color);
    color: white;
    padding: 0.8rem 1.5rem;
    border-radius: 30px;
    font-size: 0.95rem;
    font-weight: 600;
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 99999;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(142,68,173,0.35);
}
#cart-toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

/* Add to Cart button on product cards */
.add-to-cart-btn {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    font-family: 'Outfit', sans-serif;
}
.add-to-cart-btn:hover { background: #a25bc4; transform: translateY(-1px); }
.wishlist-btn {
    background: transparent;
    border: 1.5px solid var(--input-border);
    color: var(--text-color);
    width: 34px; height: 34px;
    border-radius: 50%;
    font-size: 1rem;
    cursor: pointer;
    transition: var(--transition);
    display: flex; align-items: center; justify-content: center;
}
.wishlist-btn:hover, .wishlist-btn.active { background: #fce4ec; color: #e91e63; border-color: #e91e63; }
[data-theme="dark"] .wishlist-btn:hover, [data-theme="dark"] .wishlist-btn.active {
    background: rgba(233,30,99,0.2); color: #f48fb1; border-color: #f48fb1;
}

/* ---- CART PAGE ---- */
.cart-page { max-width: 1100px; margin: 0 auto; padding: 2rem 5%; }
.page-title { font-size: 2rem; margin-bottom: 2rem; }
.cart-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 2rem;
    align-items: start;
}
@media (max-width: 768px) { .cart-layout { grid-template-columns: 1fr; } }

.cart-item {
    display: grid;
    grid-template-columns: 70px 1fr auto auto 36px;
    align-items: center;
    gap: 1rem;
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: var(--shadow);
    transition: var(--transition);
}
.cart-item:hover { transform: translateY(-2px); }
.cart-item-img {
    width: 70px; height: 70px;
    border-radius: 10px;
    background-size: cover;
    background-position: center;
    background-color: var(--input-bg);
}
.cart-item-info h4 { margin: 0 0 0.2rem; font-size: 1rem; }
.cart-item-price { color: var(--primary-color); font-weight: 600; }
.cart-item-controls { display: flex; align-items: center; gap: 0.5rem; }
.qty-btn {
    width: 28px; height: 28px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 50%;
    font-size: 1rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: var(--transition);
    color: var(--text-color);
}
.qty-btn:hover { background: var(--primary-color); color: white; border-color: var(--primary-color); }
.qty-display { font-weight: 700; min-width: 20px; text-align: center; }
.cart-item-subtotal { font-weight: 700; color: var(--primary-color); white-space: nowrap; }
.cart-remove-btn {
    background: transparent;
    border: none;
    color: #ccc;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 0.2rem;
    border-radius: 50%;
    transition: var(--transition);
    line-height: 1;
}
.cart-remove-btn:hover { color: #e74c3c; background: rgba(231,76,60,0.1); }

.cart-summary-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    position: sticky;
    top: 80px;
}
.cart-summary-card h3 { margin-bottom: 1rem; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; }
.total-row { border-top: 2px solid var(--input-border); margin-top: 0.5rem; padding-top: 1rem; font-size: 1.1rem; }

.empty-cart { text-align: center; padding: 4rem 2rem; }
.empty-cart-icon { font-size: 4rem; margin-bottom: 1rem; }
.empty-cart h3 { margin-bottom: 0.5rem; }
.empty-cart p { color: var(--text-color); opacity: 0.7; margin-bottom: 1.5rem; }

@media (max-width: 600px) {
    .cart-item { grid-template-columns: 60px 1fr; grid-template-rows: auto auto auto; }
    .cart-item-controls { grid-column: 2; }
    .cart-item-subtotal { grid-column: 2; }
    .cart-remove-btn { grid-column: 1; grid-row: 1; }
}

/* ---- CHECKOUT PAGE ---- */
.checkout-page { max-width: 1100px; margin: 0 auto; padding: 2rem 5%; }
.checkout-steps {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 2rem;
    font-size: 0.9rem;
}
.step { padding: 0.4rem 1rem; border-radius: 20px; color: var(--text-color); opacity: 0.5; }
.step.active { background: var(--primary-color); color: white; opacity: 1; font-weight: 600; }
.step.done { opacity: 0.6; }
.step-divider { opacity: 0.4; }

.checkout-layout {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 2rem;
    align-items: start;
}
@media (max-width: 900px) { .checkout-layout { grid-template-columns: 1fr; } }

.checkout-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: var(--shadow);
}
.checkout-card h2, .checkout-card h3 { margin-bottom: 1.5rem; }
.order-summary-card { position: sticky; top: 80px; }

.summary-item { display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 0.95rem; }
.summary-divider { border: none; border-top: 1px solid var(--input-border); margin: 0.8rem 0; }

.payment-methods-info {
    background: var(--input-bg);
    border-radius: 12px;
    padding: 1rem 1.2rem;
    margin: 1.5rem 0;
}
.payment-methods-info h4 { margin-bottom: 0.8rem; font-size: 0.95rem; }
.payment-icons { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.7rem; }
.payment-badge {
    background: var(--card-bg);
    border: 1px solid var(--input-border);
    padding: 0.3rem 0.7rem;
    border-radius: 20px;
    font-size: 0.85rem;
    box-shadow: var(--shadow);
}
.payment-note { font-size: 0.82rem; opacity: 0.7; }
.shipping-note { font-size: 0.85rem; opacity: 0.7; margin-top: 1rem; text-align: center; }

/* ---- ORDER CONFIRMATION ---- */
.confirmation-page { max-width: 600px; margin: 4rem auto; padding: 0 5%; }
.confirmation-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 3rem;
    box-shadow: var(--shadow);
    text-align: center;
}
.confirmation-icon { font-size: 4rem; margin-bottom: 1.5rem; }
.confirmation-card h1 { margin-bottom: 1rem; }
.confirmation-card p { opacity: 0.8; margin-bottom: 1.5rem; }
.conf-reference {
    background: var(--input-bg);
    border-radius: 10px;
    padding: 0.8rem 1.2rem;
    font-size: 0.9rem;
    margin-bottom: 2rem;
}
.confirmation-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2rem; }
.whatsapp-followup { border-top: 1px solid var(--input-border); padding-top: 1.5rem; }
.whatsapp-followup p { margin-bottom: 1rem; font-size: 0.9rem; }
.whatsapp-btn {
    background: #25D366 !important;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}
.whatsapp-btn:hover { background: #1ebe5c !important; }

/* ---- DASHBOARD ---- */
.dashboard-page { max-width: 900px; margin: 0 auto; padding: 2rem 5%; }

.dashboard-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: var(--shadow);
    margin-bottom: 2rem;
}
.dashboard-avatar {
    width: 70px; height: 70px;
    border-radius: 50%;
    background: var(--primary-color);
    color: white;
    font-size: 2rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.dashboard-user-info h2 { margin: 0 0 0.3rem; }
.dashboard-user-info p { margin: 0; opacity: 0.7; }

.dashboard-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    background: var(--input-bg);
    padding: 0.4rem;
    border-radius: 14px;
    width: fit-content;
}
.tab-btn {
    background: transparent;
    border: none;
    padding: 0.6rem 1.2rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-color);
    border-radius: 10px;
    transition: var(--transition);
    font-family: 'Outfit', sans-serif;
}
.tab-btn:hover { background: rgba(142,68,173,0.1); color: var(--primary-color); }
.tab-btn.active { background: var(--primary-color); color: white; box-shadow: 0 4px 12px rgba(142,68,173,0.3); }
.tab-content { display: none; animation: fadeIn 0.3s ease-out; }
.tab-content.active { display: block; }
@media (max-width: 600px) {
    .dashboard-tabs { width: 100%; flex-wrap: wrap; }
    .tab-btn { flex: 1; text-align: center; font-size: 0.85rem; }
}

/* Order Cards */
.order-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: var(--shadow);
    transition: var(--transition);
}
.order-card:hover { transform: translateY(-2px); }
.order-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
.order-ref { font-weight: 700; font-size: 0.9rem; display: block; }
.order-date { font-size: 0.82rem; opacity: 0.6; }
.order-status {
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 700;
}
.status-pendiente { background: rgba(255,152,0,0.12); color: #FF9800; }
.status-pagado { background: rgba(76,175,80,0.12); color: #4CAF50; }
.status-en_preparacion { background: rgba(33,150,243,0.12); color: #2196F3; }
.status-enviado { background: rgba(142,68,173,0.12); color: var(--primary-color); }
.status-entregado { background: rgba(76,175,80,0.15); color: #2e7d32; }
.status-cancelado { background: rgba(244,67,54,0.12); color: #F44336; }

.order-items-preview { margin-bottom: 1rem; }
.order-item-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.4rem 0;
    font-size: 0.9rem;
}
.order-item-row img { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; }
.order-item-row span:last-child { margin-left: auto; font-weight: 600; }
.order-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--input-border); padding-top: 1rem; }

/* Wishlist grid */
.wishlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.wishlist-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    overflow: hidden;
    box-shadow: var(--shadow);
    position: relative;
    transition: var(--transition);
}
.wishlist-card:hover { transform: translateY(-4px); }
.wishlist-img { height: 130px; background-size: cover; background-position: center; background-color: var(--input-bg); }
.wishlist-info { padding: 1rem; }
.wishlist-info h4 { font-size: 0.95rem; margin-bottom: 0.4rem; }
.wishlist-remove {
    position: absolute;
    top: 8px; right: 8px;
    background: rgba(255,255,255,0.9);
    border: none;
    border-radius: 50%;
    width: 28px; height: 28px;
    font-size: 1rem;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: var(--transition);
}
[data-theme="dark"] .wishlist-remove { background: rgba(40,30,50,0.9); color: var(--text-color); }
.wishlist-remove:hover { background: #fce4ec; color: #e91e63; }
.out-of-stock { font-size: 0.82rem; color: #e74c3c; font-weight: 600; }
.sm { padding: 0.4rem 0.8rem; font-size: 0.82rem; margin-top: 0.5rem; display: inline-block; }

/* Profile form */
.profile-form-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 2rem;
    box-shadow: var(--shadow);
    max-width: 600px;
}
.profile-form-card h3 { margin-bottom: 0.5rem; }
.form-hint { font-size: 0.88rem; opacity: 0.7; margin-bottom: 1.5rem; }

/* Loading & empty states */
.loading-spinner {
    text-align: center;
    padding: 3rem;
    opacity: 0.6;
    font-size: 1rem;
}
.empty-state {
    text-align: center;
    padding: 3rem;
    background: var(--card-bg);
    border-radius: var(--border-radius);
    opacity: 0.8;
}

/* Admin: Orders tab */
.admin-orders-table { width: 100%; border-collapse: collapse; }
.admin-orders-table th, .admin-orders-table td {
    text-align: left;
    padding: 0.8rem 1rem;
    border-bottom: 1px solid var(--input-border);
    font-size: 0.9rem;
}
.admin-orders-table th { font-weight: 600; opacity: 0.7; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em; }
.admin-orders-table tr:hover td { background: var(--input-bg); }
.status-select {
    padding: 0.3rem 0.6rem;
    border-radius: 8px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 0.85rem;
    cursor: pointer;
    font-family: 'Outfit', sans-serif;
}
