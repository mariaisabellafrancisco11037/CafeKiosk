# Admin Dashboard Restore Fix — 2026-09-29

This build changes only the Admin dashboard regression.

- Restored the complete working `dashboard.js` that was accidentally truncated during security hardening.
- Kept HttpOnly-cookie authentication; no JWT is restored to localStorage/sessionStorage.
- Preserved API polling and Socket.IO dashboard behavior from the previously working dashboard implementation.
- Updated the dashboard.js cache version so browsers fetch the restored script.
- No database schema, order routes, pricing logic, tenant isolation, Manager/Staff layouts, or System Admin behavior were intentionally changed.
