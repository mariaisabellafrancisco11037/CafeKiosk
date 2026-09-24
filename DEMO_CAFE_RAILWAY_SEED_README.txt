CafeKiosk Demo Cafe - Railway Demo Seed Fix
============================================

This build automatically prepares the dedicated CafeKiosk Demo Cafe (cafe-1)
after Railway MySQL is connected.

What is seeded for cafe-1:
- 180 menu products used by the Kiosk/POS demo menu
- 6 categories
- beverage/serving sizes and additional prices
- category-appropriate add-ons/toppings and prices
- sample inventory ingredients
- 180 matching recipes
- normalized product_sizes, category_default_sizes, ingredients, and
  product_recipe_ingredients rows when those rows are missing
- menu-config state used by the Kiosk customization dialog

Real cafe accounts are NOT populated with this demo data.

Railway behavior
----------------
railway-start.js runs the seed automatically after railway-init.js succeeds.
It is idempotent: it fills missing demo data without replacing an existing
product/menu configuration that is already present.

Expected log after deploy:
  Demo Cafe ready: 180 products, ... ingredients, 180 recipes, ... size/add-on configs.

Manual run (optional):
  npm run seed:demo

Disable automatic demo seeding by setting this Railway variable:
  AUTO_SEED_DEMO=false

Keep MYSQL_URL connected to the Railway MySQL service.
