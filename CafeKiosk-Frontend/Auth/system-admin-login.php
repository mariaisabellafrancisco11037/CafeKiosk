<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - System Administrator Login</title>
  <link rel="stylesheet" href="../Assets/css/login.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=30">
  <link rel="stylesheet" href="../Assets/css/system-monitor.css?v=1">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>
<body class="auth-body uniform-auth">
  <main class="login-page">
    <section class="login-card system-admin-login-card">
      <a href="/login" class="back-link" aria-label="Back to login selection">←</a>
      <img src="../Assets/images/logo.png" alt="CafeKiosk Logo" class="auth-logo">
      <h1>System Monitor</h1>
      <div class="role-title">System Administrator Login</div>
      <div class="monitor-login-notice">For technical monitoring only. Cafe administration data remains separated by account.</div>
      <form class="login-form" id="systemAdminLoginForm" autocomplete="on">
        <label for="systemAdminUser">User ID</label>
        <div class="line-input-wrap"><input id="systemAdminUser" name="userId" type="text" placeholder="Enter System Admin ID" autocomplete="username" required></div>
        <label for="systemAdminPassword">Password</label>
        <div class="line-input-wrap password-line"><input id="systemAdminPassword" name="password" type="password" placeholder="Enter password" autocomplete="current-password" required><button type="button" class="show-password" id="systemPasswordToggle" aria-label="Show password" title="Show password">◉</button></div>
        <div id="systemAdminLoginMessage" class="login-message" role="status" aria-live="polite"></div>
        <button type="submit" class="login-button" id="systemAdminLoginButton">LOG IN</button>
        <p class="login-hint">Use the dedicated IT/System Administrator account.</p>
      </form>
    </section>
  </main>
  <script src="../Assets/js/system-admin-login.js?v=1"></script>
  <script src="../Assets/js/password-visibility.js?v=1"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>
