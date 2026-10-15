CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  session TEXT NOT NULL,
  at TEXT NOT NULL,
  page TEXT NOT NULL,
  device TEXT NOT NULL,
  referrer TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS visits_at ON visits(at);
CREATE INDEX IF NOT EXISTS visits_session_at ON visits(session, at);
