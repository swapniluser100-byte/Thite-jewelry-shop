-- Sample data so the storefront isn't empty on first run.
-- Run with: npm run db:seed:local   (or db:seed:remote once deployed)

INSERT OR IGNORE INTO categories (id, name, slug) VALUES
  (1, 'Necklaces', 'necklaces'),
  (2, 'Earrings', 'earrings'),
  (3, 'Bracelets', 'bracelets'),
  (4, 'Rings', 'rings');

INSERT OR IGNORE INTO products (name, slug, description, price_cents, category_id, image_url, stock_qty, is_active) VALUES
  ('Amber Drop Necklace', 'amber-drop-necklace', 'Hand-wrapped amber pendant on a delicate brass chain.', 189900, 1, '', 12, 1),
  ('Moonstone Hoop Earrings', 'moonstone-hoop-earrings', 'Small hammered brass hoops set with raw moonstone.', 124900, 2, '', 20, 1),
  ('Woven Cord Bracelet', 'woven-cord-bracelet', 'Adjustable macrame bracelet with a single freshwater pearl.', 79900, 3, '', 30, 1),
  ('Stacking Ring Trio', 'stacking-ring-trio', 'Three thin hand-forged brass rings, sold as a set.', 149900, 4, '', 15, 1),
  ('Terracotta Bead Necklace', 'terracotta-bead-necklace', 'Hand-rolled terracotta clay beads on waxed cotton cord.', 99900, 1, '', 18, 1),
  ('Copper Leaf Earrings', 'copper-leaf-earrings', 'Lightweight hammered copper leaves, nickel-free posts.', 89900, 2, '', 25, 1);
