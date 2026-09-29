# CafeKiosk Live Order Sync Recovery — 2026-09-29

This patch keeps the rapid security hardening but corrects a production custom-domain realtime regression.

## What caused the regression
The rapid hardening made Socket.IO origin checks stricter. On Railway/custom-domain deployments, the browser Origin can be `https://cafekiosk.site` while the proxy-facing Host/origin configuration differs or `PUBLIC_BASE_URL` / `CORS_ALLOWED_ORIGINS` is missing. That can reject the legitimate CafeKiosk realtime handshake.

## Fixes
- Trusts the known CafeKiosk production domains (`cafekiosk.site` and `www.cafekiosk.site`) for production origin checks.
- Uses `X-Forwarded-Host` before the internal proxy Host when validating same-site requests.
- Keeps the strict Socket.IO `allowRequest` gate, while removing the duplicate conflicting Socket.IO CORS rejection.
- Preserves HttpOnly-cookie auth, live DB role/tenant checks, CSRF protection, tenant isolation, server-authoritative pricing, rate limits, and the other rapid-hardening protections.
- Cache-busts the Admin/Manager/Staff order monitor scripts.

## Recommended Railway variables
For explicit production configuration, set:

`PUBLIC_BASE_URL=https://cafekiosk.site`

and/or:

`CORS_ALLOWED_ORIGINS=https://cafekiosk.site`

## After deployment
Log out/in once, hard-refresh the order-monitor pages, then place one fresh Kiosk order. The order queue still has REST polling as a fallback, so a temporary websocket reconnect must not hide a persisted order.
