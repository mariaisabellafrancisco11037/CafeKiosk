<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Staff Sign Up</title>
  <link rel="stylesheet" href="../Assets/css/signup.css?v=1">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>
<body>
  <main class="signup-page">
    <section class="signup-card" style="max-width:650px">
      <a class="signup-back" href="/login" aria-label="Back to login">←</a>
      <img class="signup-logo" src="../Assets/images/logo.png" alt="CafeKiosk">
      <h1>Staff Sign Up</h1>
      <p class="signup-subtitle">Create your account using the invitation sent by your cafe owner or Admin.</p>

      <div id="inviteError" class="invite-error" hidden></div>

      <form id="staffSignupForm" autocomplete="on">
        <input id="staffInviteToken" type="hidden">
        <div id="staffSignupFields">
          <div class="invite-info">
            <div class="invite-chip"><small>Cafe</small><strong id="inviteCafe">Checking...</strong></div>
            <div class="invite-chip"><small>Role</small><strong id="inviteRole">Staff</strong></div>
            <div class="invite-chip"><small>Email</small><strong id="inviteEmail">Checking...</strong></div>
          </div>
          <div class="signup-grid">
            <div class="signup-field full">
              <label for="staffEmail">Invited Email</label>
              <input id="staffEmail" type="email" readonly>
            </div>
            <div class="signup-field">
              <label for="staffFullName">Full Name</label>
              <input id="staffFullName" maxlength="120" required autocomplete="name">
            </div>
            <div class="signup-field">
              <label for="staffSignupUsername">User ID / Username</label>
              <input id="staffSignupUsername" maxlength="60" required autocomplete="username">
            </div>
            <div class="signup-field">
              <label for="staffSignupPassword">Password</label>
              <input id="staffSignupPassword" type="password" minlength="8" maxlength="128" required autocomplete="new-password">
            </div>
            <div class="signup-field">
              <label for="staffSignupConfirm">Confirm Password</label>
              <input id="staffSignupConfirm" type="password" minlength="8" maxlength="128" required autocomplete="new-password">
            </div>
            <div class="signup-field full">
              <div id="staffSignupMessage" class="signup-message" role="status" aria-live="polite"></div>
              <button class="signup-submit" type="submit">CREATE STAFF ACCOUNT</button>
            </div>
          </div>
        </div>
      </form>
      <p class="signup-footer">Already have an account? <a href="/staff-login">Staff Login</a></p>
    </section>
  </main>
  <script src="../Assets/js/signup.js?v=1"></script>
  <script src="../Assets/js/password-visibility.js?v=1"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>
