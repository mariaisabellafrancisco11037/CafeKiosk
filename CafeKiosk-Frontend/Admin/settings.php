<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CafeKiosk - Settings</title>
<link rel="stylesheet" href="../Assets/css/admin-extension.css">
<link rel="stylesheet" href="../Assets/css/kiosk-access.css?v=1">
<script src="../Assets/js/auth-session.js"></script>
<link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=20260928-mobile-v1">
<link rel="stylesheet" href="../Assets/css/profile-menu.css?v=31-approval-id-layout">
<link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
<link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
<link rel="apple-touch-icon" href="/Assets/images/logo.png">
<style>
.settings-page-intro{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}
.settings-page-intro h2{margin:0 0 6px;color:#49372b}.settings-page-intro p{margin:0;color:#8a7768;line-height:1.55;max-width:720px}
.settings-section-title{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}.settings-section-title h3{margin:0;color:#4a392d;font-size:16px}.settings-section-title span{font-size:11px;color:#9a8778}
.settings-config-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.settings-config-card{width:100%;min-height:128px;display:grid;grid-template-columns:52px minmax(0,1fr) 24px;align-items:center;gap:14px;padding:18px;border:1px solid var(--ck-line,#dfd1bd);border-radius:16px;background:#fffdf9;text-align:left;color:inherit;cursor:pointer;font:inherit;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease,background .16s ease}
.settings-config-card:hover,.settings-config-card:focus-visible{transform:translateY(-2px);border-color:#79ad91;background:#fff;box-shadow:0 10px 24px rgba(65,78,63,.09);outline:none}.settings-config-card:active{transform:translateY(0)}
.settings-config-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:15px;background:#edf5ef;font-size:24px}.settings-config-copy{min-width:0}.settings-config-copy strong{display:block;color:#4a392d;font-size:15px}.settings-config-copy p{margin:5px 0 8px;color:#8b7766;font-size:11px;line-height:1.45}.settings-config-summary{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:#62816c;font-size:10px;font-weight:700}.settings-config-summary .muted{color:#9a8778;font-weight:600}.settings-config-arrow{font-size:24px;color:#6f8e78;text-align:right}
.settings-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.settings-link-card{display:grid;grid-template-columns:52px minmax(0,1fr) 24px;align-items:center;gap:14px;padding:18px;border:1px solid var(--ck-line,#dfd1bd);border-radius:16px;background:#fffdf9;text-decoration:none;color:inherit;transition:.18s ease}.settings-link-card:hover,.settings-link-card:focus-visible{transform:translateY(-2px);border-color:#79ad91;box-shadow:0 10px 24px rgba(65,78,63,.09);outline:none}.settings-link-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:15px;background:#edf5ef;font-size:22px}.settings-link-copy{min-width:0}.settings-link-copy strong{display:block;font-size:15px;color:#4a392d}.settings-link-copy span{display:block;margin-top:5px;font-size:11px;color:#8b7766;line-height:1.45}.settings-link-arrow{font-size:24px;color:#6f8e78;text-align:right}
.settings-modal-section{border:1px solid #eadfd2;border-radius:14px;padding:15px;background:#fffdf9;margin-bottom:12px}.settings-modal-section h3{margin:0 0 5px;font-size:14px;color:#4a392d}.settings-modal-section>p{margin:0 0 12px;color:#8b7766;font-size:11px;line-height:1.45}
.payment-setting-list{display:grid;gap:10px}.payment-setting-row{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border:1px solid #eadfd2;border-radius:13px;background:#fff}.payment-setting-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;background:#f0f6f1;font-size:20px}.payment-setting-main strong{display:block;color:#4a392d;font-size:13px}.payment-setting-main small{display:block;color:#927e6d;margin-top:2px}.payment-setting-name{margin-top:8px}.payment-setting-name input{width:100%}.settings-switch{position:relative;width:46px;height:26px;flex:0 0 auto}.settings-switch input{opacity:0;width:0;height:0}.settings-switch span{position:absolute;inset:0;border-radius:999px;background:#d7d0c7;transition:.18s}.settings-switch span:before{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;background:#fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:.18s}.settings-switch input:checked+span{background:#5a9a70}.settings-switch input:checked+span:before{transform:translateX(20px)}
.settings-help{padding:10px 12px;border-radius:11px;background:#f3f7f3;color:#607466;font-size:11px;line-height:1.45}.settings-save-status{min-height:18px;font-size:11px;color:#4f7e60;margin-right:auto}.settings-save-status.bad{color:#b44b47}.settings-save-status.ok{color:#397a54}
@media(max-width:800px){.settings-config-grid,.settings-admin-grid{grid-template-columns:1fr}.settings-page-intro{display:block}.settings-config-card,.settings-link-card{min-height:unset;padding:15px}.settings-config-icon,.settings-link-icon{width:46px;height:46px;border-radius:13px}.payment-setting-row{grid-template-columns:40px minmax(0,1fr) auto}.payment-setting-icon{width:40px;height:40px}}
@media(max-width:480px){.settings-config-card,.settings-link-card{grid-template-columns:44px minmax(0,1fr) 18px;gap:10px;padding:13px}.settings-config-copy p,.settings-link-copy span{font-size:10px}.settings-config-summary{font-size:9px}}
</style>
  <link rel="stylesheet" href="/Assets/css/developer-footer.css?v=20261001-footer-fix3">
  <link rel="stylesheet" href="/Assets/css/responsive-devices.css?v=20261001-layout-fix3">
</head>
<body class="ck-admin-page uniform-admin">
<div class="ck-shell">
<aside class="ck-sidebar">
<a class="ck-brand" href="/admin/dashboard"><img src="../Assets/images/logo.png" alt="CafeKiosk"></a>
<div class="ck-side-label">ADMIN</div>
<nav class="ck-nav">
<a href="/admin/dashboard"><span class="ico">▦</span><span class="label">Dashboard</span></a>
<a href="/admin/order-monitor"><span class="ico">🛒</span><span class="label">Order</span></a>
<a href="/admin/menu-management"><span class="ico">▤</span><span class="label">Menu Management</span></a>
<a href="/admin/promotions"><span class="ico">%</span><span class="label">Promotions &amp; Discount</span></a>
<a href="/admin/inventory"><span class="ico">□</span><span class="label">Inventory</span></a>
<a href="/admin/report"><span class="ico">▥</span><span class="label">Report</span></a>
<a href="/admin/settings" class="active"><span class="ico">⚙</span><span class="label">Settings</span></a>
</nav>
</aside>
<main class="ck-main">
<div class="ck-topbar"><div class="ck-title"><h1>Settings</h1></div><div class="ck-profile"><span>● &nbsp;<span id="adminName">Administrator</span></span><span>⌄</span></div></div>

<section class="ck-card">
  <div class="settings-page-intro">
    <div><h2>Store Configuration</h2><p>Manage checkout options, cafe information and operational defaults. Changes are saved per cafe and remain isolated from other CafeKiosk tenants.</p></div>
  </div>
  <div class="settings-config-grid">
    <button class="settings-config-card" type="button" data-setting="payment">
      <span class="settings-config-icon" aria-hidden="true">💳</span>
      <span class="settings-config-copy"><strong>Payment Methods</strong><p>Choose which payment options Staff, Manager and Kiosk users can use.</p><span class="settings-config-summary" id="paymentSettingSummary"><span class="muted">Loading...</span></span></span>
      <span class="settings-config-arrow" aria-hidden="true">›</span>
    </button>
    <button class="settings-config-card" type="button" data-setting="store">
      <span class="settings-config-icon" aria-hidden="true">🏪</span>
      <span class="settings-config-copy"><strong>Store Information</strong><p>Update cafe identity, contact information and operating hours.</p><span class="settings-config-summary" id="storeSettingSummary"><span class="muted">Loading...</span></span></span>
      <span class="settings-config-arrow" aria-hidden="true">›</span>
    </button>
    <button class="settings-config-card" type="button" data-setting="tax">
      <span class="settings-config-icon" aria-hidden="true">％</span>
      <span class="settings-config-copy"><strong>Tax &amp; Service Charges</strong><p>Maintain the cafe's configured tax and service-charge rates.</p><span class="settings-config-summary" id="taxSettingSummary"><span class="muted">Loading...</span></span></span>
      <span class="settings-config-arrow" aria-hidden="true">›</span>
    </button>
    <button class="settings-config-card" type="button" data-setting="preferences">
      <span class="settings-config-icon" aria-hidden="true">⚙</span>
      <span class="settings-config-copy"><strong>System Preferences</strong><p>Set order defaults, currency display, stock warning defaults and receipt footer.</p><span class="settings-config-summary" id="preferenceSettingSummary"><span class="muted">Loading...</span></span></span>
      <span class="settings-config-arrow" aria-hidden="true">›</span>
    </button>
    <button class="settings-config-card" type="button" data-setting="kiosk">
      <span class="settings-config-icon" aria-hidden="true">☕</span>
      <span class="settings-config-copy"><strong>Kiosk Access</strong><p>Manage this cafe's customer Kiosk link and branded QR code.</p><span class="settings-config-summary"><span>Kiosk link &amp; QR</span></span></span>
      <span class="settings-config-arrow" aria-hidden="true">›</span>
    </button>
  </div>
</section>

<section class="ck-card" id="administrationSettings">
  <div class="settings-section-title"><div><h3>Administration &amp; Security</h3></div><span>Account &amp; activity controls</span></div>
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
</main>
</div>

<div class="ck-modal" id="settingsModal"><div class="ck-dialog" style="max-width:680px"><div class="ck-toolbar"><h2 id="settingsTitle">Settings</h2><button class="ck-btn" id="closeSettings" type="button">Close</button></div><div id="settingsBody"></div></div></div>
<script src="../Assets/js/kiosk-qr.js?v=1"></script>
<script src="../Assets/js/settings-page.js?v=20260928-settings-v4"></script>
<script src="../Assets/js/uniform-theme.js?v=20261001-layout-fix3"></script>
<script src="../Assets/js/profile-menu.js?v=logout-confirm-v2"></script>
<script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
  <script src="/Assets/js/developer-footer.js?v=20261001-footer-fix3"></script>
  <script src="/Assets/js/responsive-navigation.js?v=20261001-layout-fix3"></script>
</body>
</html>
