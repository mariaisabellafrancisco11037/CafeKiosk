<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Reset Password</title>
  <link rel="stylesheet" href="/Assets/css/login.css?v=password-recovery-v1">
  <link rel="stylesheet" href="/Assets/css/uniform-theme.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>
<body class="auth-body uniform-auth">
  <main class="login-page">
    <section class="login-card password-recovery-card">
      <a href="/login" class="back-link" aria-label="Back to login">←</a>
      <img src="/Assets/images/logo.png" alt="CafeKiosk Logo" class="auth-logo">
      <h1>Reset Password</h1>
      <div class="role-title" id="resetAccountTitle">Checking secure link...</div>

      <div id="resetLinkStatus" class="recovery-status-card">Validating your password-reset link...</div>

      <form class="login-form" id="resetPasswordForm" autocomplete="off" hidden>
        <label for="newPassword">New Password</label>
        <div class="line-input-wrap password-line">
          <input id="newPassword" name="newPassword" type="password" placeholder="At least 8 characters" autocomplete="new-password" maxlength="128" required>
          <button type="button" class="show-password" data-password-target="newPassword" aria-label="Show password" title="Show password">◉</button>
        </div>

        <label for="confirmPassword">Confirm New Password</label>
        <div class="line-input-wrap password-line">
          <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter your new password" autocomplete="new-password" maxlength="128" required>
          <button type="button" class="show-password" data-password-target="confirmPassword" aria-label="Show password" title="Show password">◉</button>
        </div>

        <div class="password-requirements">
          Use at least 8 characters with at least one letter and one number.
        </div>

        <div id="resetPasswordMessage" class="login-message" role="status" aria-live="polite"></div>
        <button type="submit" class="login-button" id="resetPasswordButton">RESET PASSWORD</button>
      </form>

      <a href="/login" class="recovery-login-link" id="recoveryLoginLink">Back to Login</a>
    </section>
  </main>

  <script src="/Assets/js/reset-password.js?v=password-recovery-v1"></script>
  <script src="/Assets/js/password-visibility.js?v=1"></script>
  <script src="/Assets/js/uniform-theme.js"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>
