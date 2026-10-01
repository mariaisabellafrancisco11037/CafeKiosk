CAFEKIOSK BULK MENU IMPORT
==========================

Open: Admin > Menu Management > Import Menu

FASTEST WAY TO REPLACE IMAGES
1. Click Import Menu.
2. Select ONE OR MANY image ZIP files at the same time. A CSV is not required.
3. Click Prepare Preview.
4. CafeKiosk matches image filenames to existing product names automatically.
   Examples:
     21_Black_Coffee.png -> Black Coffee
     08_Iced_Caramel_Macchiato.png -> Iced Caramel Macchiato
5. Review the matches and click Start Import.

FULL MENU CREATION / UPDATE
1. Click Download CSV Template in the importer (or use CafeKiosk-DataBase/CafeKiosk_Menu_Import_Template.csv).
2. Fill in products.
3. Upload the CSV and, optionally, select multiple image ZIP batches at once.
4. Prepare Preview, review the results, then Start Import.

CSV COLUMNS
- name: required product name
- category: required category
- price: required base price
- description: optional
- availability: Available or Unavailable
- image: optional exact image filename
- sizes: optional, separated by semicolons
  Syntax: Size Name:Added Price:Recipe Multiplier
  Example: Regular:0:1;Large:30:1.5
- ingredients: optional, separated by semicolons
  Syntax: Inventory Ingredient Name:Base Quantity:required
  Optional ingredient example: Boba Pearls:50:option:Pearls

IMPORTANT
- Ingredient names must already exist in Inventory Monitor.
- Importing updates matching products and adds new ones; it does not delete menu items not included in the CSV.
- Images are optimized automatically before database upload.
- Image-only import skips filenames that do not match a product and reports them in the preview.

MULTI-ZIP IMPORT (NEW)
- The Image ZIP field now supports selecting multiple .zip files in one selection.
- CafeKiosk opens every selected ZIP and merges all unique image filenames into one import queue.
- This supports your separate 10-image batches across Coffee, Non-Coffee, Milk Tea, Foods, Snacks, and Dessert.
- Example: select Coffee_1_10.zip + Coffee_11_20.zip + ... + Dessert_171_180.zip, then click Prepare Preview once.
- Duplicate filenames are skipped deterministically (the first selected copy is kept) and listed in the preview notes.
- Loose PNG/JPG/WebP images can still be selected together with the ZIP batches.
