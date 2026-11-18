CREATE TABLE IF NOT EXISTS enquiries (
    id TEXT PRIMARY KEY, service TEXT NOT NULL, office TEXT NOT NULL,
    name TEXT NOT NULL, company TEXT NOT NULL, email TEXT NOT NULL,
    origin TEXT NOT NULL, destination TEXT NOT NULL, cargo TEXT NOT NULL,
    planned_date TEXT NOT NULL, language TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','closed')),
    notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS deleted_enquiry_receipts (id TEXT PRIMARY KEY);
CREATE INDEX IF NOT EXISTS enquiries_created_idx ON enquiries(created_at, id);
CREATE INDEX IF NOT EXISTS enquiries_status_created_idx ON enquiries(status, created_at, id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires);
CREATE TRIGGER IF NOT EXISTS remember_deleted_enquiry AFTER DELETE ON enquiries
BEGIN
  INSERT OR IGNORE INTO deleted_enquiry_receipts(id) VALUES (OLD.id);
END;
