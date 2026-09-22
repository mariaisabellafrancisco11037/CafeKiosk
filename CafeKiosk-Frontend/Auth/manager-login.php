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
    href="../Assets/css/login.css"
  >
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
</head>

<body
  class="auth-body uniform-auth"
  data-role="Manager"
>

  <main class="login-page">

    <section class="login-card">

      <a
        href="../Auth/login.php"
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
            autocomplete="username"
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


        <button
          type="button"
          class="forgot-button"
          data-forgot
        >
          Forgot Password?
        </button>


        <p class="login-hint">
          Sign in using your authorized CafeKiosk manager account.
        </p>

        <p class="auth-signup-link"><a href="/staff-signup">Create account from invitation</a></p>

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
        Please contact your CafeKiosk cafe owner or administrator
        to reset your staff account password.
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
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
