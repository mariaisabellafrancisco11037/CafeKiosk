# Security #1 login cache compatibility fix

The hardened backend no longer returns a browser-readable JWT in the login JSON. It sets the signed authentication credential in an HttpOnly cookie instead.

Older cached `Assets/js/login.js` versions expected both `data.token` and `data.user`. When the new backend correctly returned `data.user` but intentionally omitted `data.token`, the stale script displayed `The server returned an invalid login response.` even though authentication had succeeded.

Fixes:
- Admin, Manager, and Staff login pages now request `login.js?v=server-auth-cookie-v2`.
- `/Assets/js/login.js` is served with `Cache-Control: no-store` so security-protocol changes cannot leave an obsolete authentication client cached.
- No database credentials, passwords, or user data are changed by this fix.
