<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Create Cafe Account</title>
  <link rel="stylesheet" href="../Assets/css/signup.css?v=3">
  <link rel="stylesheet" href="../Assets/css/kiosk-access.css?v=1">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>
<body>
  <main class="signup-page">
    <section class="signup-card">
      <a class="signup-back" href="/login" aria-label="Back to login">←</a>
      <img class="signup-logo" src="../Assets/images/logo.png" alt="CafeKiosk">
      <h1>Create Your Cafe Account</h1>
      <p class="signup-subtitle">Register as the cafe owner. Your Admin account will stay locked until the CafeKiosk System Administrator reviews and approves the registration.</p>

      <form id="ownerSignupForm" class="signup-grid" autocomplete="on">
        <div class="signup-field full">
          <label for="cafeName">Cafe Name</label>
          <input id="cafeName" maxlength="150" required placeholder="Example: Carl's Cafe">
        </div>
        <div class="signup-field">
          <label for="ownerFullName">Owner Full Name</label>
          <input id="ownerFullName" maxlength="120" required autocomplete="name">
        </div>
        <div class="signup-field">
          <label for="ownerPhone">Phone Number</label>
          <input id="ownerPhone" maxlength="40" autocomplete="tel" placeholder="Optional">
        </div>
        <div class="signup-field">
          <label for="ownerEmail">Email Address</label>
          <input id="ownerEmail" type="email" maxlength="190" required autocomplete="email">
        </div>
        <div class="signup-field">
          <label for="ownerUsername">User ID / Username</label>
          <input id="ownerUsername" maxlength="60" required autocomplete="username">
        </div>
        <div class="signup-field">
          <label for="ownerPassword">Password</label>
          <input id="ownerPassword" type="password" minlength="8" maxlength="128" required autocomplete="new-password">
        </div>
        <div class="signup-field">
          <label for="ownerConfirmPassword">Confirm Password</label>
          <input id="ownerConfirmPassword" type="password" minlength="8" maxlength="128" required autocomplete="new-password">
        </div>
        <div class="signup-note">After signup, your request is sent to the <strong>System Administrator for approval</strong>. Staff and Manager accounts can only be invited after the cafe owner is approved.</div>
        <div class="signup-field full">
          <div id="ownerSignupMessage" class="signup-message" role="status" aria-live="polite"></div>
          <button class="signup-submit" type="submit">CREATE CAFE ACCOUNT</button>
        </div>
      </form>

      <section id="ownerApprovalPending" class="owner-approval-pending" hidden>
        <div class="approval-pending-icon" aria-hidden="true">✓</div>
        <span class="approval-pending-kicker">REGISTRATION RECEIVED</span>
        <h2>Waiting for System Administrator Approval</h2>
        <p>Your cafe account was created securely, but it is not active yet. A System Administrator must approve the registration before the owner can sign in.</p>
        <div class="approval-pending-details"><span>Cafe</span><strong id="pendingCafeName">—</strong><span>Cafe ID</span><strong id="pendingCafeId">—</strong></div>
        <p class="approval-pending-help">After approval, return to Admin Login and use the username/email and password you registered.</p>
        <a class="signup-submit approval-login-link" href="/admin-login">GO TO ADMIN LOGIN</a>
      </section>

      <section id="ownerKioskSetup" class="owner-kiosk-setup" hidden>
        <div class="owner-kiosk-success">
          <div class="coffee-mark" aria-hidden="true">☕</div>
          <h2>Your cafe account is ready!</h2>
          <div id="signupKioskOnlineBadge" class="signup-kiosk-online"><span></span> Kiosk: Online</div>
          <p><strong>Here’s your Kiosk link.</strong> Your Kiosk is already online after account setup. You can keep the generated address or customize it for convenience. The saved link will also create your cafe’s own QR code.</p>
        </div>

        <div class="kiosk-access-card">
          <div class="kiosk-url-box">
            <code id="signupKioskUrl">http://YOUR-LAPTOP-IP:5000/kiosk/my-cafe</code>
            <button type="button" class="kiosk-mini-btn" id="signupCopyKiosk">Copy</button>
          </div>

          <div>
            <label for="signupKioskSlug" style="display:block;font-weight:800;color:#563722;margin-bottom:7px">Customize your Kiosk address</label>
            <div class="kiosk-slug-row">
              <span class="kiosk-slug-prefix" id="signupKioskPrefix">http://YOUR-LAPTOP-IP:5000/kiosk/</span>
              <input id="signupKioskSlug" class="kiosk-slug-input" maxlength="40" autocomplete="off" spellcheck="false" aria-describedby="signupKioskStatus">
            </div>
            <div id="signupKioskStatus" class="kiosk-link-status">Your default link is already registered. Customize it only if you want a shorter name.</div>
          </div>

          <div class="kiosk-actions">
            <button type="button" class="kiosk-mini-btn" id="signupCheckKiosk">Check Availability</button>
            <button type="button" class="kiosk-mini-btn primary" id="signupSaveKiosk">Save Kiosk Link</button>
            <button type="button" class="kiosk-mini-btn" id="signupOpenKiosk">Open Kiosk</button>
          </div>

          <div class="kiosk-qr-wrap">
            <div class="kiosk-qr-card">
              <div class="kiosk-qr-brand">Cafe<span>Kiosk</span></div>
              <canvas id="signupKioskQr" width="360" height="360"></canvas>
              <div class="kiosk-qr-caption">Scan to Open Kiosk</div>
            </div>
            <div class="kiosk-qr-copy">
              <h4>Your cafe’s QR code</h4>
              <p>This QR code is unique to your cafe. When the Kiosk link changes and is saved, the QR code updates to the new registered link.</p>
              <button type="button" class="kiosk-mini-btn" id="signupDownloadQr">Download QR</button>
            </div>
          </div>

          <button type="button" class="signup-submit" id="signupContinueLogin">CONTINUE TO ADMIN LOGIN</button>
        </div>
      </section>

      <p class="signup-footer">Already registered? <a href="/admin-login">Admin Login</a></p>
    </section>
  </main>
  <script src="../Assets/js/kiosk-qr.js?v=1"></script>
  <script src="../Assets/js/signup.js?v=4"></script>
  <script src="../Assets/js/password-visibility.js?v=1"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
