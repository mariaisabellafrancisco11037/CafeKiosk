<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CafeKiosk - Settings</title><link rel="stylesheet" href="../Assets/css/admin-extension.css">
  <link rel="stylesheet" href="../Assets/css/kiosk-access.css?v=1"><script src="../Assets/js/auth-session.js"></script>  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=20260928-mobile-v1">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">

<style>
.settings-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}
.settings-link-card{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px;border:1px solid var(--ck-line,#dfd1bd);border-radius:14px;background:#fffdf9;text-decoration:none;color:inherit;transition:.18s ease}
.settings-link-card:hover{transform:translateY(-1px);border-color:#79ad91;box-shadow:0 8px 22px rgba(65,78,63,.08)}
.settings-link-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;background:#edf5ef;font-size:22px;flex:0 0 auto}
.settings-link-copy{flex:1}.settings-link-copy strong{display:block;font-size:14px;color:#4a392d}.settings-link-copy span{display:block;margin-top:4px;font-size:11px;color:#8b7766;line-height:1.45}
.settings-link-arrow{font-size:22px;color:#6f8e78}
@media(max-width:700px){.settings-admin-grid{grid-template-columns:1fr}.settings-link-card{padding:15px}}
</style>
</head><body class="ck-admin-page uniform-admin"><div class="ck-shell"><aside class="ck-sidebar"><a class="ck-brand" href="/admin/dashboard"><img src="../Assets/images/logo.png" alt="CafeKiosk"></a><div class="ck-side-label">ADMIN</div><nav class="ck-nav">
<a href="/admin/dashboard"><span class="ico">▦</span><span class="label">Dashboard</span></a>
<a href="/admin/order-monitor"><span class="ico">🛒</span><span class="label">Order</span></a>
<a href="/admin/menu-management"><span class="ico">▤</span><span class="label">Menu Management</span></a>
<a href="/admin/promotions" class=""><span class="ico">%</span><span class="label">Promotions & Discount</span></a>
<a href="/admin/inventory"><span class="ico">□</span><span class="label">Inventory</span></a>
<a href="/admin/report"><span class="ico">▥</span><span class="label">Report</span></a>
<a href="/admin/settings" class="active"><span class="ico">⚙</span><span class="label">Settings</span></a>
</nav></aside><main class="ck-main"><div class="ck-topbar"><div class="ck-title"><h1>Admin Settings Monitor</h1></div><div class="ck-profile"><span>● &nbsp;<span id="adminName">Administrator</span></span><span>⌄</span></div></div><section class="ck-card"><h2>System Settings</h2><div class="ck-grid"><div class="ck-card"><div class="ck-toolbar"><div><strong>💳 &nbsp; Payment Method</strong><div class="ck-muted">Configure payment options available to POS and Kiosk.</div></div><button class="ck-btn primary" data-setting="payment">Configure</button></div></div><div class="ck-card"><div class="ck-toolbar"><div><strong>🏪 &nbsp; Store Information</strong><div class="ck-muted">Business name, address, contact information and operating hours.</div></div><button class="ck-btn primary" data-setting="store">Manage</button></div></div><div class="ck-card"><div class="ck-toolbar"><div><strong>％ &nbsp; Tax & Service Charges</strong><div class="ck-muted">Set tax rates and service charges for orders.</div></div><button class="ck-btn primary" data-setting="tax">Configure</button></div></div><div class="ck-card"><div class="ck-toolbar"><div><strong>⚙ &nbsp; System Preferences</strong><div class="ck-muted">Customize system preferences and defaults.</div></div><button class="ck-btn primary" data-setting="preferences">Manage</button></div></div><div class="ck-card"><div class="ck-toolbar"><div><strong>☕ &nbsp; Kiosk Access</strong><div class="ck-muted">Manage this cafe's unique Kiosk link and branded QR code.</div></div><button class="ck-btn primary" data-setting="kiosk">Manage</button></div></div></div></section>
<section class="ck-card" id="administrationSettings">
  <div class="ck-toolbar">
    <div><h2>Administration &amp; Security</h2><div class="ck-muted">User Management and Audit Logs are grouped under Settings to keep the main Admin navigation focused on daily cafe operations.</div></div>
  </div>
  <div class="settings-admin-grid">
    <a class="settings-link-card" href="/admin/users">
      <span class="settings-link-icon" aria-hidden="true">👥</span>
      <span class="settings-link-copy"><strong>User Management</strong><span>Add or invite Staff/Managers, manage employee access, and review former employee archives.</span></span>
      <span class="settings-link-arrow" aria-hidden="true">›</span>
    </a>
    <a class="settings-link-card" href="/admin/audit-logs">
      <span class="settings-link-icon" aria-hidden="true">📋</span>
      <span class="settings-link-copy"><strong>Audit Logs</strong><span>Review account changes and important system activity recorded for this cafe.</span></span>
      <span class="settings-link-arrow" aria-hidden="true">›</span>
    </a>
  </div>
</section>
</main></div><div class="ck-modal" id="settingsModal"><div class="ck-dialog" style="max-width:620px"><div class="ck-toolbar"><h2 id="settingsTitle">Settings</h2><button class="ck-btn" id="closeSettings">Close</button></div><div id="settingsBody"></div></div></div><script src="../Assets/js/kiosk-qr.js?v=1"></script>
  <script src="../Assets/js/settings-page.js?v=3"></script>  <script src="../Assets/js/uniform-theme.js?v=20260928-mobile-v1"></script>
  <script src="../Assets/js/profile-menu.js?v=logout-confirm-v2"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body></html>
