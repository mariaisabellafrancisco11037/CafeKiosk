<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>
    CafeKiosk - Admin Login
  </title>

  <link
    rel="stylesheet"
    href="../Assets/css/login.css"
  >
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>

<body
  class="auth-body uniform-auth"
  data-role="Admin"
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
        Admin Login
      </div>

      <form
        class="login-form"
        autocomplete="on"
      >

        <label for="adminUserId">
          User ID
        </label>

        <div class="line-input-wrap">

          <input
            id="adminUserId"
            name="userId"
            type="text"
            placeholder="Enter your User ID"
            autocomplete="username"
            maxlength="80"
            required
          >

        </div>


        <label for="adminPassword">
          Password
        </label>

        <div class="line-input-wrap password-line">

          <input
            id="adminPassword"
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
            data-password-target="adminPassword"
            aria-label="Show password"
            title="Show password"
          >
            ◉
          </button>

        </div>


        <div
          id="adminLoginMessage"
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


        <button
          type="button"
          class="forgot-button"
          data-forgot
        >
          Forgot Password?
        </button>


        <p class="login-hint">
          Sign in using your authorized CafeKiosk admin account.
        </p>

        <p class="auth-signup-link"><a href="/owner-signup">Create a new cafe account</a></p>

      </form>

    </section>

  </main>


  <div
    id="forgotModal"
    class="forgot-overlay"
    aria-hidden="true"
  >

    <section
      class="forgot-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgotTitle"
    >

      <button
        id="closeForgot"
        type="button"
        class="forgot-close"
        aria-label="Close"
      >
        ×
      </button>


      <h2 id="forgotTitle">
        Forgot Password
      </h2>


      <p>
        Please contact your CafeKiosk administrator or system manager
        to reset your admin account password.
      </p>


      <button
        id="forgotOk"
        type="button"
        class="modal-ok"
      >
        OK
      </button>

    </section>

  </div>


  <script src="../Assets/js/login.js"></script>

  <script src="../Assets/js/uniform-theme.js"></script>
  <script src="../Assets/js/password-visibility.js?v=1"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>
