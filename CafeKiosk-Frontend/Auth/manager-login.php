<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>
    CafeKiosk - Manager Login
  </title>

  <link
    rel="stylesheet"
    href="../Assets/css/login.css?v=20261005-tablet-auth-v1"
  >
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=20260928-mobile-v1">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
<link rel="stylesheet" href="/Assets/css/responsive-devices.css?v=20261001-mobile-shell-v7">
  <link rel="stylesheet" href="/Assets/css/developer-footer.css?v=20261003-systemwide-scroll-footer-v1">
</head>

<body
  class="auth-body uniform-auth"
  data-role="Manager"
>

  <main class="login-page">

    <section class="login-card">

      <a
        href="/login"
        class="back-link"
        aria-label="Back to login selection"
      >
        ←
      </a>

      <img
        src="../Assets/images/logo.png"
        alt="CafeKiosk Logo"
        class="auth-logo"
      >

      <h1>
        Welcome Back
      </h1>

      <div class="role-title">
        Manager Login
      </div>

      <form
        class="login-form"
        autocomplete="on"
      >

        <label for="managerUserId">
          User ID
        </label>

        <div class="line-input-wrap">

          <input
            id="managerUserId"
            name="userId"
            type="text"
            placeholder="Enter your User ID"
            autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false"
            maxlength="80"
            required
          >

        </div>


        <label for="managerPassword">
          Password
        </label>

        <div class="line-input-wrap password-line">

          <input
            id="managerPassword"
            name="password"
            type="password"
            placeholder="Enter your password"
            autocomplete="current-password"
            maxlength="128"
            required
          >

          <button
            type="button"
            class="show-password"
            data-password-target="managerPassword"
            aria-label="Show password"
            title="Show password"
          >
            ◉
          </button>

        </div>


        <div
          id="managerLoginMessage"
          class="login-message"
          role="status"
          aria-live="polite"
        ></div>


        <button
          type="submit"
          class="login-button"
        >
          LOG IN
        </button>

        <a class="forgot-button" href="/forgot-password?role=manager">Forgot Password?</a>


        <p class="login-hint">
          Sign in using your authorized CafeKiosk manager account.
        </p>

        <p class="auth-signup-link"><a href="/staff-signup">Create account from invitation</a></p>

      </form>

    </section>

  </main>

  <script src="../Assets/js/login.js?v=20261005-tablet-auth-v1"></script>

  <script src="../Assets/js/uniform-theme.js?v=20261001-mobile-shell-v7"></script>
  <script src="../Assets/js/password-visibility.js?v=1"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
<script src="/Assets/js/responsive-navigation.js?v=20261001-mobile-shell-v7"></script>
  <script src="/Assets/js/developer-footer.js?v=20261003-systemwide-scroll-footer-v1"></script>
</body>
</html>
