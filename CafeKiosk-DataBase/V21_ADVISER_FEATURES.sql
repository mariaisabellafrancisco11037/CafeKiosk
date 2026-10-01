-- CafeKiosk V21 - Adviser features
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_id VARCHAR(32) NULL;
CREATE UNIQUE INDEX uq_users_approval_id ON users (approval_id);
UPDATE products p JOIN categories c ON c.category_id=p.category_id SET p.image_path=CASE WHEN c.canonical_key='coffee' THEN '/Assets/images/coffee.png' WHEN c.canonical_key='non-coffee' THEN '/Assets/images/non-coffee.png' WHEN c.canonical_key IN ('milktea','milk-tea') THEN '/Assets/images/milktea.png' WHEN c.canonical_key IN ('food','foods') THEN '/Assets/images/food.png' WHEN c.canonical_key IN ('snack','snacks') THEN '/Assets/images/snack.png' WHEN c.canonical_key='dessert' THEN '/Assets/images/dessert.png' ELSE '/Assets/images/logo.png' END WHERE p.cafe_id='cafe-1' AND (p.image_path IS NULL OR p.image_path='');
