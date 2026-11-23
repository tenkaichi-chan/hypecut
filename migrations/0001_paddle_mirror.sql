-- Mirror of Paddle customers and subscriptions (SQLite / Cloudflare D1).
-- Adapted from the Postgres schema: TIMESTAMP -> ISO-8601 TEXT, NOW() -> datetime('now').
-- Extra columns:
--   last_event_at   Paddle's occurred_at for the last event applied. Webhooks can arrive out of
--                   order, so an older event never overwrites newer state.
--   license_key     Pro key (HC-...) that identifies the customer to the portal route.

CREATE TABLE IF NOT EXISTS customers (
  customer_id   TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_event_at TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id         TEXT PRIMARY KEY,
  customer_id             TEXT NOT NULL REFERENCES customers(customer_id),
  status                  TEXT NOT NULL,
  price_id                TEXT NOT NULL,
  product_id              TEXT NOT NULL,
  scheduled_change_action TEXT,
  scheduled_change_at     TEXT,
  license_key             TEXT UNIQUE,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  last_event_at           TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
