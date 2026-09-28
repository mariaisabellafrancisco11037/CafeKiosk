# CafeKiosk Security-Hardened Build

This build treats all browser-controlled values as untrusted. Editing Local Storage, HTML, JavaScript variables, query strings, request bodies, or DevTools cannot by itself grant another role or another cafe's data.

## Important ownership/privacy boundary

CafeKiosk now enforces tenant isolation at the application layer. An Admin/Manager/Staff account can only operate on the `cafe_id` contained in its signed authenticated session.

However, no normal web application can cryptographically hide production data from a person who owns the production infrastructure credentials. A developer with unrestricted Railway project access, MySQL credentials, backups, or the ability to deploy arbitrary server code is effectively an infrastructure administrator. If a cafe owner requires that developers cannot inspect production data, the production Railway project/database must be owned by the cafe owner (or a trusted organization), and developer access must be removed or limited after deployment.

## Security changes in this build

- Protected endpoints derive `cafe_id` from the signed authenticated session, not `localStorage`, query strings, or request bodies.
- Admin inventory quantities and recipe/stock endpoints require Admin authentication.
- Public real-cafe catalog enumeration by `?cafeId=` is blocked; public customer catalogs are resolved through the cafe's unique kiosk slug.
- Public menu configuration is sanitized; recipe ingredient data is not exposed to unauthenticated users.
- Active promotions for a public kiosk are resolved through the kiosk slug rather than an arbitrary cafe ID.
- Socket.IO Admin/POS/Order Queue rooms are bound to the authenticated user's cafe.
- Guest kiosk sockets are accepted only when the page came from a valid active kiosk slug.
- Guest clients cannot join arbitrary order-specific Socket.IO rooms.
- Raw browser order request bodies are no longer rebroadcast to tenant rooms.
- Product base prices, product names/categories, promotions, tax/service charge, subtotal and final total are recalculated on the server from the cafe's database before an order is stored.
- Negative client-side customization prices cannot reduce an order.
- POS orders require an authenticated Staff/Manager/Admin session.
- Login, PIN verification and password-recovery endpoints have rate limiting.
- JWT signing uses a shared security configuration; production never falls back to the published `cafekiosk-demo-secret`.
- HttpOnly authentication cookies use Secure + SameSite=Strict in production.
- HSTS, nosniff, frame denial, referrer and permissions security headers are added.
- Request body sizes are limited and production CORS is no longer "allow every origin".
- Express hides the `X-Powered-By` header.

## Railway variable to add

Set `JWT_SECRET` in CafeKiosk -> Variables to a random value at least 32 characters long. Without it the hardened build generates a random in-memory key, which is secure against token forgery but logs everyone out whenever the service restarts.

Do not enable `ALLOW_FALLBACK_DEMO_ACCOUNTS` on Railway.

## What is intentionally still public

A cafe's public Kiosk must show customers its menu and selling prices. Those values are public to anyone who has that cafe's Kiosk link. Internal sales history, inventory quantities, recipes, account data, and other cafes are not part of that public catalog.
