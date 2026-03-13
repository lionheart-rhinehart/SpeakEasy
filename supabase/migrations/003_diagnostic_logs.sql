-- Diagnostic logs table for automatic error reporting from beta testers.
-- The app uploads WARN/ERROR log entries on startup so developers can
-- diagnose issues without asking users to manually send log files.

CREATE TABLE diagnostic_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id  TEXT NOT NULL,
  app_version TEXT NOT NULL,
  os_info     TEXT,
  log_entries TEXT NOT NULL,
  line_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE diagnostic_logs ENABLE ROW LEVEL SECURITY;

-- Anon can INSERT (app uploads with anon key), cannot SELECT (privacy)
CREATE POLICY "Allow anonymous diagnostic inserts"
  ON diagnostic_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role can read everything (developer dashboard queries)
CREATE POLICY "Service role full access to diagnostics"
  ON diagnostic_logs FOR ALL
  TO service_role
  USING (true);

-- Indexes for efficient querying by machine and time
CREATE INDEX idx_diagnostic_logs_machine_id ON diagnostic_logs(machine_id);
CREATE INDEX idx_diagnostic_logs_created_at ON diagnostic_logs(created_at DESC);
