-- Sparkle by Kimberley orders database (Cloudflare D1)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                -- our reference, e.g. SBK-M2K9QX-7Q
  stripe_session_id TEXT NOT NULL UNIQUE,
  payment_intent TEXT,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  address_json TEXT,                  -- delivery address as JSON (null for download-only orders)
  subtotal_pence INTEGER NOT NULL,
  shipping_pence INTEGER NOT NULL DEFAULT 0,
  total_pence INTEGER NOT NULL,
  confirmation_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  variant TEXT,
  quantity INTEGER NOT NULL,
  unit_price_pence INTEGER NOT NULL,
  fulfilment TEXT NOT NULL,           -- cj | prodigi | digital | manual (or any new supplier)
  supplier_sku TEXT,
  supplier_variant_id TEXT,
  supplier_order_id TEXT,
  -- pending | submitted | fulfilled | awaiting_owner | shipped | delivered | cancelled | failed
  status TEXT NOT NULL DEFAULT 'pending',
  tracking_number TEXT,
  tracking_url TEXT,
  carrier TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  customer_notified INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lines_order ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_lines_status ON order_lines(status);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id);

-- Small key/value store (e.g. the cached CJdropshipping access token)
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
