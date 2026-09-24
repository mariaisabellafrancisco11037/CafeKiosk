CAFEKIOSK - PANELIST IMPROVEMENTS BUILD
=======================================

This build includes the four requested improvements:

1) CAFE NAME ON EVERY AUTHENTICATED WORKSPACE
   - Admin, Manager and Staff/POS pages display a persistent cafe identity badge.
   - The badge is loaded from the authenticated user's cafe in MySQL, not a hard-coded demo name.
   - Browser titles include the cafe name.
   - Kiosk pages continue to show the cafe name from the kiosk tenant/slug.
   - Changing Cafe Name in Admin Settings also updates the cafes table so the identity stays synchronized.

2) ROLE-BASED AUTHENTICATION / TENANT ISOLATION
   - Protected pages verify JWT/cookie authentication AND confirm that the user is still Active in MySQL.
   - The cafe must also be Active and approved.
   - Admin/Manager/Staff roles keep their page/API permissions.
   - Sensitive order queue/status APIs now require an authenticated operational account.
   - Admin settings, promotions, inventory, recipes and other protected data use the authenticated cafe_id rather than trusting a cafeId sent by the browser.
   - Hard-coded fallback Admin/Staff login is disabled on Railway/production unless ALLOW_FALLBACK_DEMO_ACCOUNTS=true is explicitly set.
   - Railway derives a deployment-specific JWT secret if JWT_SECRET is not supplied.

3) SYSTEM ADMIN NEW-CAFE APPROVAL
   - Public owner registration creates the cafe as Inactive + Pending Approval.
   - Owner login is blocked until System Admin approval.
   - System Monitor has an Account Approval queue with Approve/Reject actions.
   - Rejection requires a reason and the reason is shown to the owner on login.
   - Approval/rejection history is stored in cafe_approval_history.
   - Existing cafes are migrated as Approved; CafeKiosk Demo Cafe (cafe-1) stays approved and usable.

4) MENU MANAGEMENT CATEGORY X-AXIS SCROLLBAR
   - Categories stay on a single horizontal row.
   - A visible horizontal scrollbar appears when categories exceed available width.
   - Mouse wheel, touchpad and touch-screen horizontal navigation are supported.
   - The category section has a fixed height so adding many categories does not steal space from Menu Items.

RAILWAY DEPLOYMENT
------------------
No manual database reset is required. railway-start.js runs the safe upgrade migration on startup.
Existing data is preserved.

Recommended Railway private variables before final/public use:
  SYSTEM_ADMIN_USER=<your private system admin username>
  SYSTEM_ADMIN_PASSWORD=<a strong private password>
  JWT_SECRET=<optional strong random secret; Railway derives one if omitted>

The demo tenant remains available for presentation:
  Cafe: CafeKiosk Demo Cafe (cafe-1)

After pushing this build, check Railway logs for:
  "Panelist-requested security/account schema ready"
