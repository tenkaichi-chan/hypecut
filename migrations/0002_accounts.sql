-- Optional user accounts (email + password). The free tool still works without one.
-- Passwords: PBKDF2-SHA256, 100,000 iterations, 16-byte random salt (hex). Never stored in plain text.
-- Sessions: a random 32-byte token lives only in the visitor's HttpOnly cookie; the table keeps its SHA-256 hash.

CREATE TABLE IF NOT EXISTS users (
  user_id     TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,          -- stored lower-cased
  pass_hash   TEXT NOT NULL,
  pass_salt   TEXT NOT NULL,
  pro_key     TEXT,                          -- HC-... key linked to this account (Dodo or Paddle)
  free_period TEXT,                          -- "YYYY-MM" the free_used count belongs to
  free_used   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Failed log-ins per email, to slow down password guessing.
CREATE TABLE IF NOT EXISTS login_failures (
  email      TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  window_at  TEXT NOT NULL
);
