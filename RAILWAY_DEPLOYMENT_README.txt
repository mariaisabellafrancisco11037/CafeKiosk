CAFEKIOSK - RAILWAY FIXED BUILD
================================

WHAT WAS FIXED
1. Railway no longer enters a restart/crash loop only because MySQL variables are missing.
2. CafeKiosk accepts MYSQL_URL, MYSQL_PRIVATE_URL, DATABASE_URL, MYSQL_PUBLIC_URL,
   or Railway's individual MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE variables.
3. Railway's RAILWAY_PUBLIC_DOMAIN is used for public CafeKiosk / kiosk / invitation links.
4. First-time Railway MySQL databases can be initialized automatically from schema.sql.
5. Browser alert messages use a centered CafeKiosk message dialog.
6. Login/signup final errors and messages use the centered message dialog instead of appearing above the form.

REQUIRED RAILWAY SETUP
----------------------
A code change cannot create a Railway service-to-service secret reference by itself.
In your CafeKiosk service -> Variables, add:

MYSQL_URL=${{MySQL.MYSQL_URL}}

IMPORTANT: "MySQL" must exactly match the name of your Railway MySQL service.
If your database service is named CafeDB, use:

MYSQL_URL=${{CafeDB.MYSQL_URL}}

Then review/deploy the staged changes.

If you do not have a MySQL service yet:
1. Open the Railway project.
2. Click + New -> Database -> MySQL.
3. Open the CafeKiosk web service -> Variables.
4. Create MYSQL_URL as the reference variable shown above.
5. Redeploy CafeKiosk.

OPTIONAL VARIABLES
------------------
AUTO_INIT_DB=true
PUBLIC_APP_URL=https://your-domain.up.railway.app
KIOSK_BASE_URL=https://your-domain.up.railway.app

PUBLIC_APP_URL/KIOSK_BASE_URL are normally optional because the app now detects
RAILWAY_PUBLIC_DOMAIN and forwarded request headers.

SECURITY
--------
Do not commit your real .env file or a literal Railway MySQL password to GitHub.
Use Railway reference variables instead.
