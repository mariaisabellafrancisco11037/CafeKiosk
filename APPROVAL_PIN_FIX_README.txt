CafeKiosk Approval PIN Fix
==========================

What changed
------------
1. Existing Railway databases are upgraded at startup with:
   - users.approval_pin_hash
   - users.approval_pin_updated_at
2. Saving a PIN now reads the stored hash back and verifies the exact PIN before reporting success.
3. Admin/Manager Profile > Approval PIN now includes "Test Current PIN".
4. A saved PIN is intentionally NOT recoverable/displayable. It is bcrypt-hashed.
   If forgotten, save a new PIN to replace the old one.
5. Staff refund/void approval continues to accept any active Admin/Manager PIN from the same cafe.

After deploying this version
----------------------------
1. Redeploy CafeKiosk on Railway.
2. In Railway logs, look for:
   "Admin/Manager approval PIN database fields ready."
3. Log out of the Admin/Manager account and log back in once.
4. Open Profile > Approval PIN.
5. Enter a 4-6 digit PIN twice and click "Save / Replace PIN".
6. The message must say: "Approval PIN saved and verified successfully."
7. Enter the same PIN under "Test Current PIN" and click "Test PIN".
8. Test a Staff refund/void using that PIN.

If the Railway database is older and the startup migration reports an error,
run CafeKiosk-DataBase/V19_APPROVAL_PIN_MIGRATION.sql against the Railway MySQL
database, then redeploy.
