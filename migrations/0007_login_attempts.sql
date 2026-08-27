CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT NOT NULL,
  ip TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts (username, attempted_at);
