# CafeKiosk Rapid Security Hardening

This build consolidates the security review so the remaining controls do not need to be applied one by one.

## Core trust model
- Browser/localStorage values are UI state only, never proof of identity, role, cafe, price, totals or approval.
- Cafe users authenticate with Secure/HttpOnly/SameSite cookies backed by revocable MySQL sessions.
- Every protected request reloads current role/cafe/account state from MySQL.
- The exact issued JWT is now bound to its `user_sessions.token_hash`.
- System Administrator authentication is cookie-only; Bearer tokens are not accepted for that privileged role.

## Rapid hardening added in this build
1. Exact session-token hash binding for Admin/Manager/Staff.
2. Cookie-only System Administrator API authentication.
3. High-priority secure cookies.
4. Cross-site mutation protection for authenticated API requests (CSRF defense-in-depth).
5. Same-origin/restricted Socket.IO handshake origins in production.
6. Baseline Content-Security-Policy blocking foreign scripts, frames, plugins and form targets while keeping existing inline CafeKiosk UI compatible.
7. Cross-Origin-Resource-Policy, Origin-Agent-Cluster and cross-domain-policy headers.
8. API responses use `Cache-Control: no-store`.
9. Global API abuse ceiling plus existing stricter login/PIN/recovery limits.
10. Owner/staff signup and invitation validation throttling.
11. Public kiosk slug/catalog lookup throttling.
12. Production DB-health/network debug APIs require System Administrator login.
13. Public production `/health` exposes only `status: ok`.
14. System Admin overview no longer returns MySQL database name/version/time.
15. Audit paths do not retain query strings, reducing reset/invite token leakage.
16. Audit-log result size is capped.
17. Socket authentication uses the same exact-token/session binding as HTTP.

## Existing protections retained
- Server-side authentication and session revocation.
- Strong JWT secret checks.
- Live database role/account/cafe revalidation.
- Server-side role authorization.
- Multi-cafe tenant isolation.
- Admin-only inventory/private business APIs.
- Public kiosk isolation by registered slug.
- Public catalog sanitization.
- Server-authoritative base prices, totals, promotions, tax and service charge.
- Authenticated POS orders.
- Socket room isolation.
- Login, approval-PIN and password-recovery rate limits.
- HttpOnly/Secure/SameSite cookies.
- CORS allowlisting, HSTS, clickjacking/nosniff/referrer/permissions protection.
- Request body limits and Express fingerprint reduction.
- Production fallback demo authentication disabled.
- Brute-force warnings/temporary account locks and IT security alerts.

## Manual production requirements
Keep these Railway variables private and configured:
- `JWT_SECRET` — random 32+ characters; do not rotate casually because rotation logs everyone out.
- `SYSTEM_ADMIN_USER`
- `SYSTEM_ADMIN_PASSWORD` — 12+ characters.
- `ALLOW_FALLBACK_DEMO_ACCOUNTS=false`

The live Railway/MySQL database is not copied into GitHub. GitHub contains application code/schema/migrations only.

## Important infrastructure boundary
Application tenant isolation prevents normal cafe users, other tenants and the System Admin UI from reading another cafe's financial records. A person who owns Railway/MySQL administrator credentials remains infrastructure-privileged; true owner-vs-developer confidentiality requires production infrastructure ownership/least-privilege access after handoff.
