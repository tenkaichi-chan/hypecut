-- Gumroad Pro clip counts and redeemed top-ups (moved here from KV, whose reads can be ~60 s stale).
-- One row per Pro key per calendar month ("YYYY-MM"). Counts change with single UPDATE statements,
-- so two clips made at once can't both slip past the monthly limit.

CREATE TABLE IF NOT EXISTS gumroad_usage (
  license_key TEXT NOT NULL,             -- Gumroad Pro license key (upper-case)
  period      TEXT NOT NULL,             -- "YYYY-MM"
  used        INTEGER NOT NULL DEFAULT 0,
  boosts      INTEGER NOT NULL DEFAULT 0, -- +10-clip top-ups added this month
  PRIMARY KEY (license_key, period)
);

-- A top-up key works once: the primary key makes a second redeem fail.
CREATE TABLE IF NOT EXISTS gumroad_topups (
  topup_key   TEXT PRIMARY KEY,
  license_key TEXT NOT NULL,
  period      TEXT NOT NULL,
  redeemed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
