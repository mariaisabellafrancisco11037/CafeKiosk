# Rapid Defense Tests

Run these after deployment. You do not need to test all 30 controls individually.

1. **Staff DevTools tamper:** change localStorage role/userId/cafeId to Admin/another cafe. Admin APIs must still return 403 or use the authenticated cafe.
2. **Cross-cafe test:** while logged into Cafe A, request a known Cafe B order/inventory identifier. No Cafe B private data should be returned.
3. **Role downgrade:** keep a Manager logged in, change that account to Staff from Admin, then refresh Manager page. Access should stop immediately.
4. **Session revocation:** log out and use Back/refresh; protected APIs/pages must require login again.
5. **Price tamper:** change a kiosk/POS item price/total in DevTools before submission. Persisted order must use server/database pricing.
6. **System Admin privacy:** Network > `/api/system-admin/overview` must not contain sales, revenue, profit, prices, payment totals, owner username, MySQL version/name, or transaction contents.
7. **Brute force:** use a disposable test account only. Repeated wrong passwords should warn IT and temporarily lock at the configured threshold.
8. **Cookie check:** Application > Cookies should show cafe auth cookie as HttpOnly/Secure on production. No readable JWT should exist in localStorage/sessionStorage.
9. **Debug endpoints:** while logged out in production, `/api/db-health` and `/api/network-info` should return 401 instead of database/network details.
10. **Kiosk smoke test:** place a normal kiosk order, then verify Staff/Manager/Admin live order screens still receive it.

If these ten tests pass, they cover the main attack surfaces behind the larger 30-control list.
