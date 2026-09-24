<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Forgot Password</title>
  <link rel="stylesheet" href="/Assets/css/login.css?v=password-recovery-v1">
  <link rel="stylesheet" href="/Assets/css/uniform-theme.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>
<body class="auth-body uniform-auth">
  <main class="login-page">
    <section class="login-card password-recovery-card">
      <a href="/login" class="back-link" id="forgotBackLink" aria-label="Back to login">←</a>
      <img src="/Assets/images/logo.png" alt="CafeKiosk Logo" class="auth-logo">
      <h1>Forgot Password</h1>
      <div class="role-title" id="recoveryRoleTitle">Account Recovery</div>

      <p class="recovery-intro">
        Enter the email address registered to your CafeKiosk account. We will send a secure, one-time password reset link if the account is eligible for recovery.
      </p>

      <form class="login-form" id="forgotPasswordForm" autocomplete="on">
        <label for="recoveryEmail">Registered Email</label>
        <div class="line-input-wrap">
          <input id="recoveryEmail" name="email" type="email" placeholder="Enter your registered email" autocomplete="email" maxlength="190" required>
        </div>

        <div id="forgotPasswordMessage" class="login-message" role="status" aria-live="polite"></div>

        <button type="submit" class="login-button" id="sendResetButton">SEND RESET LINK</button>

        <p class="recovery-security-note">
          For security, CafeKiosk will not reveal whether an email address is registered. Reset links expire after 30 minutes and can only be used once.
        </p>
      </form>
    </section>
  </main>

  <script src="/Assets/js/forgot-password.js?v=password-recovery-v1"></script>
  <script src="/Assets/js/uniform-theme.js"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>
