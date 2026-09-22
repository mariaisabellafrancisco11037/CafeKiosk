# CafeKiosk V11 - Complete Project

This package includes the latest uniform Admin/POS/Kiosk UI fixes, LAN/WebSocket support, audit-log scrolling, the rewritten MySQL database, and owner/staff signup.

## Signup
- Owner: `/owner-signup`
- Staff: invitation link generated from **Admin > User > Invite Staff to Sign Up**
- Existing login: `/login`

## Database
Import `CafeKiosk-DataBase/schema.sql` before using newly registered accounts. The schema resets the `cafekiosk` database, so back up existing data first.

For default XAMPP MySQL, you can use `IMPORT_DATABASE_XAMPP.bat`.

## Run
Use `START_CAFEKIOSK_LAN.bat` and use the LAN IP printed by the terminal for tablets.

## V16 sample test accounts
For quick testing without resetting the database, run `ADD_TEST_ACCOUNTS.bat`.

- Admin/Owner: `admin` / `admin123`
- Staff: `staff` / `staff123`
- Cafe ID: `cafe-1`

The helper creates or resets only these sample accounts and reactivates them. It does not drop the database.

## V18 Full MySQL Runtime Integration
Run `MIGRATE_SAMPLE_DATA_TO_MYSQL.bat` once after configuring MySQL, then run `VERIFY_FULL_DATABASE_INTEGRATION.bat` and `START_CAFEKIOSK_LAN.bat`.

V18 moves the major runtime modules to MySQL: catalog/categories, availability, recipe/inventory state, orders/order items, promotions, audit logs, settings, users/auth, dashboard/report source data. The migration is non-destructive and does not drop the `cafekiosk` database.

See `MYSQL_FULL_INTEGRATION_V18_README.txt` for details.
