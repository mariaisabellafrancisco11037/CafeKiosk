<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CafeKiosk - Users</title>
  <link rel="stylesheet" href="../Assets/css/admin-extension.css">
  <script src="../Assets/js/auth-session.js?v=14"></script>
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <style>
    .user-name-cell{display:grid;gap:3px}.user-name-line{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.user-owner-pill{font-size:10px;font-weight:800;padding:3px 7px;border-radius:999px;background:#efe2c5;color:#715536}.user-self-pill{font-size:10px;font-weight:800;padding:3px 7px;border-radius:999px;background:#e8f3ec;color:#376d52}.user-status-reason{font-size:11px;color:var(--ck-muted);margin-top:5px}.status-action-btn[disabled]{opacity:.5;cursor:not-allowed}.status-dialog-account{padding:12px 14px;border:1px solid var(--ck-line);border-radius:10px;background:#fbf5e9;margin-bottom:14px}.status-dialog-account strong{display:block}.status-warning{padding:10px 12px;border-radius:9px;background:#fff1ef;color:#8e433e;font-size:12px;line-height:1.45}.status-warning.activate{background:#edf7f0;color:#376d52}.reason-count{text-align:right;font-size:11px;color:var(--ck-muted);margin-top:5px}.ck-table.users-table{min-width:980px}.status-note-card{position:relative;padding:16px 16px 12px;border:1px solid #d8c88d;border-radius:10px;background:#fff9d9;box-shadow:0 5px 14px rgba(93,74,35,.08)}.status-note-card::before{content:'NOTE';position:absolute;top:-9px;left:14px;padding:2px 8px;border-radius:999px;background:#e6d489;color:#5e4b21;font-size:9px;font-weight:900;letter-spacing:.08em}.status-note-card label{margin-top:2px}.status-note-card .ck-textarea{min-height:118px;resize:vertical;background:#fffdf0;border-color:#cabd81;line-height:1.5}.status-note-card .ck-textarea:focus{outline:2px solid rgba(121,173,145,.22);border-color:var(--ck-green)}.status-note-help{font-size:11px;color:#786b45;line-height:1.45;margin-top:7px}.status-note-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px}.status-note-required{font-size:10px;font-weight:800;color:#7b6640}.status-note-meta .reason-count{margin:0}
  .invite-delivery-status{padding:10px 12px;border-radius:9px;font-size:12px;line-height:1.5;border:1px solid #d9d1c2;background:#f8f5ef;color:#5f584f}.invite-delivery-status[data-type="success"]{background:#edf7f0;border-color:#bdd8c7;color:#2f6849}.invite-delivery-status[data-type="warning"]{background:#fff7df;border-color:#ead18a;color:#765d1e}</style>
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
</head>
<body class="ck-admin-page uniform-admin">
<div class="ck-shell">
  <aside class="ck-sidebar">
    <a class="ck-brand" href="/Admin/dashboard.php"><img src="../Assets/images/logo.png" alt="CafeKiosk"></a>
    <div class="ck-side-label">ADMIN</div>
    <nav class="ck-nav">
      <a href="/Admin/dashboard.php"><span class="ico">▦</span><span class="label">Dashboard</span></a>
      <a href="/admin/order-monitor"><span class="ico">🛒</span><span class="label">Order</span></a>
      <a href="/Admin/menu-management.php"><span class="ico">▤</span><span class="label">Menu Management</span></a>
      <a href="/Admin/promotions-discount.php"><span class="ico">%</span><span class="label">Promotions & Discount</span></a>
      <a href="/Admin/inventory.php"><span class="ico">□</span><span class="label">Inventory</span></a>
      <a href="/Admin/report.php"><span class="ico">▥</span><span class="label">Report</span></a>
      <a href="/Admin/audit-logs.php"><span class="ico">▣</span><span class="label">Audit Logs</span></a>
      <a href="/Admin/user.php" class="active"><span class="ico">●</span><span class="label">User</span></a>
      <a href="/Admin/settings.php"><span class="ico">⚙</span><span class="label">Settings</span></a>
    </nav>
  </aside>

  <main class="ck-main">
    <div class="ck-topbar">
      <div class="ck-title"><h1>Admin Users Monitor</h1></div>
      <div class="ck-profile"><span>● &nbsp;<span id="adminName">Administrator</span></span><span>⌄</span></div>
    </div>

    <section class="ck-card">
      <div class="ck-toolbar">
        <div>
          <h2>User Accounts</h2>
          <div class="ck-muted">Manage database-backed Admin, Manager, and Staff accounts for this cafe. Deactivation immediately signs the account out.</div>
        </div>
        <div class="ck-actions">
          <button class="ck-btn" id="inviteUser">Invite Staff / Manager</button>
          <button class="ck-btn primary" id="addUser">+ Add User</button>
        </div>
      </div>

      <div class="ck-grid three" style="margin-bottom:12px">
        <input class="ck-input" id="userSearch" placeholder="Search name, User ID, or email...">
        <select class="ck-select" id="roleFilter">
          <option value="">All Roles</option><option>Admin</option><option>Manager</option><option>Staff</option>
        </select>
        <select class="ck-select" id="statusFilter">
          <option value="">All Status</option><option>Active</option><option>Inactive</option><option>Pending</option>
        </select>
      </div>
      <div id="usersMessage" class="ck-muted" style="min-height:18px;margin-bottom:8px"></div>
      <div id="usersTable"></div>
    </section>
  </main>
</div>

<!-- CREATE / EDIT USER -->
<div class="ck-modal" id="userModal">
  <div class="ck-dialog" style="max-width:620px">
    <div class="ck-toolbar"><h2 id="userModalTitle">Add User</h2><button class="ck-btn" id="closeUser" type="button">Close</button></div>
    <form id="userForm" class="ck-grid two">
      <input type="hidden" id="editUserDbId">
      <div class="ck-field"><label>Name</label><input class="ck-input" id="userName" required></div>
      <div class="ck-field"><label>User ID</label><input class="ck-input" id="userId" required></div>
      <div class="ck-field"><label>Email</label><input class="ck-input" id="userEmail" type="email" required></div>
      <div class="ck-field"><label>Phone</label><input class="ck-input" id="userPhone" placeholder="Optional"></div>
      <div class="ck-field"><label>Role</label><select class="ck-select" id="userRole"><option>Staff</option><option>Manager</option><option>Admin</option></select></div>
      <div class="ck-field"><label id="passwordLabel">Temporary Password</label><input class="ck-input" id="userPassword" type="password" minlength="8" autocomplete="new-password"><div class="ck-muted" id="passwordHelp">Required for a new account. Minimum 8 characters.</div></div>
      <div class="ck-actions" style="grid-column:1/-1;justify-content:flex-end"><button class="ck-btn" id="cancelUser" type="button">Cancel</button><button class="ck-btn primary" type="submit" id="saveUser">Save User</button></div>
    </form>
  </div>
</div>

<!-- ACTIVATE / DEACTIVATE REASON -->
<div class="ck-modal" id="statusModal">
  <div class="ck-dialog" style="max-width:540px">
    <div class="ck-toolbar"><h2 id="statusModalTitle">Deactivate Account</h2><button class="ck-btn" id="closeStatus" type="button">Close</button></div>
    <div class="status-dialog-account"><strong id="statusAccountName">Account</strong><span class="ck-muted" id="statusAccountMeta"></span></div>
    <div class="status-warning" id="statusWarning">The user will be signed out immediately from every connected Admin/POS page.</div>
    <form id="statusForm" class="ck-grid" style="margin-top:14px">
      <input type="hidden" id="statusUserId">
      <input type="hidden" id="statusNewValue">
      <div class="ck-field status-note-card">
        <label id="statusReasonLabel">Admin Note</label>
        <textarea class="ck-textarea" id="statusReason" rows="5" maxlength="500" required placeholder="Write a short account note..."></textarea>
        <div class="status-note-help" id="statusNoteHelp">This note explains why the account status is being changed. It will be saved with the account history and Audit Logs.</div>
        <div class="status-note-meta"><span class="status-note-required">Required note</span><div class="reason-count"><span id="reasonCount">0</span>/500</div></div>
      </div>
      <div class="ck-actions" style="justify-content:flex-end"><button class="ck-btn" type="button" id="cancelStatus">Cancel</button><button class="ck-btn danger" type="submit" id="confirmStatus">Deactivate Account</button></div>
    </form>
  </div>
</div>

<!-- STAFF INVITATION -->
<div class="ck-modal" id="inviteModal">
  <div class="ck-dialog" style="max-width:560px">
    <div class="ck-toolbar"><div><h2>Invite Staff / Manager</h2><div class="ck-muted">Send a secure CafeKiosk registration link directly to the employee's email.</div></div><button class="ck-btn" id="closeInvite" type="button">Close</button></div>
    <form id="inviteForm" class="ck-grid">
      <div class="ck-field"><label>Staff / Manager Email</label><input class="ck-input" id="inviteEmailInput" type="email" required autocomplete="email" placeholder="employee@example.com"></div>
      <div class="ck-field"><label>Role</label><select class="ck-select" id="inviteRoleInput"><option value="Staff">Staff / Cashier</option><option value="Manager">Manager</option></select></div>
      <button class="ck-btn primary" type="submit">Send Email Invitation</button>
      <div id="inviteMessage" class="ck-muted" style="min-height:20px"></div>
      <div id="inviteDeliveryStatus" class="invite-delivery-status" style="display:none"></div>
      <div id="inviteResult" style="display:none">
        <div class="ck-field"><label>Backup Sign Up Link</label><input class="ck-input" id="inviteLink" readonly></div>
        <div class="ck-actions"><button class="ck-btn" type="button" id="copyInvite">Copy Link</button><a class="ck-btn" id="openInvite" href="#" target="_blank" rel="noopener">Open Link</a></div>
        <div class="ck-muted" style="margin-top:8px">The email is the primary delivery method. Keep this backup link only in case the employee does not receive the message. It expires automatically and can be used once.</div>
      </div>
    </form>
  </div>
</div>

<script src="../Assets/js/user-page.js?v=15"></script>
<script src="../Assets/js/staff-invite.js?v=2"></script>
<script src="../Assets/js/uniform-theme.js?v=33"></script>
<script src="../Assets/js/profile-menu.js?v=31"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
