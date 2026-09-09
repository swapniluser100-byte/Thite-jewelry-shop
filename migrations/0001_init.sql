-- Initial schema for the handmade jewelry store
-- Run with: wrangler d1 execute jewelry_shop_db --file=./migrations/0001_init.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  price_cents   INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'INR',
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  image_url     TEXT,
  stock_qty     INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  postal_code TEXT,
  country     TEXT DEFAULT 'India',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- status lifecycle: pending_payment -> payment_submitted -> paid -> processing -> shipped -> delivered
--                    (any state) -> cancelled / refunded
CREATE TABLE IF NOT EXISTS orders (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number       TEXT NOT NULL UNIQUE,
  customer_id        INTEGER NOT NULL REFERENCES customers(id),
  status             TEXT NOT NULL DEFAULT 'pending_payment',
  subtotal_cents     INTEGER NOT NULL,
  shipping_cents     INTEGER NOT NULL DEFAULT 0,
  total_cents        INTEGER NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'INR',
  payment_method     TEXT NOT NULL DEFAULT 'qr_code',
  payment_reference  TEXT,
  shipping_name      TEXT,
  shipping_address   TEXT,
  shipping_city      TEXT,
  shipping_state     TEXT,
  shipping_postal    TEXT,
  shipping_country   TEXT,
  customer_notes     TEXT,
  admin_notes        TEXT,
  tracking_number    TEXT,
  carrier            TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name     TEXT NOT NULL,
  product_image    TEXT,
  unit_price_cents INTEGER NOT NULL,
  quantity         INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_status_history_order ON order_status_history(order_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id         TEXT PRIMARY KEY,
  admin_id   INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  email_type   TEXT NOT NULL,
  recipient    TEXT NOT NULL,
  subject      TEXT,
  status       TEXT NOT NULL DEFAULT 'queued', -- queued | sent | failed | dead_letter
  error        TEXT,
  attempts     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_log_order ON email_log(order_id);

-- Site-wide key/value settings: payment QR image, bank/UPI details, brand info, from-email
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_name', 'Luna & Clay Jewelry'),
  ('brand_color', '#a9744f'),
  ('support_email', 'hello@example.com'),
  ('from_email', 'orders@example.com'),
  ('payment_qr_image_url', ''),
  ('payment_upi_id', ''),
  ('payment_instructions', 'Scan the QR code with any UPI app and enter the amount shown. After paying, submit your transaction reference below.');
