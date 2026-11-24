-- Google sign-in: remember the Google account id ("sub") for users who sign in with Google.
-- Google-only users have an empty pass_hash, so password log-in can never match for them.
ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
