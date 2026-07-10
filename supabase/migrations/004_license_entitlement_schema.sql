-- Migration: License Entitlement Schema (Track C — P1-license / §11 #1 & #5)
--
-- Extends the pre-existing `licenses` table with the entitlement fields the
-- master plan's license spine requires, WITHOUT touching existing data or the
-- live `activations`/`admins` tables. All changes are additive and idempotent
-- (ADD COLUMN IF NOT EXISTS), so running this against the production beta
-- database cannot lock out or relicense current beta users (P1-license-compat).
--
-- Pre-existing shape this migration assumes (created before repo migration
-- tracking; verified from src-tauri/src/license.rs query columns):
--   licenses(id uuid pk, license_key text, is_active bool, max_activations int,
--            expires_at timestamptz, created_at timestamptz,
--            assigned_to_email/name/at  [added in 001])
--   activations(id, license_id -> licenses.id, machine_id text, app_version text,
--            os_type text, is_active bool, last_validated_at timestamptz,
--            user_name text, user_email text)
--   admins(email text, role text)
-- `max_activations` already fills the role of the plan's "max_devices" (the
-- per-license device-slot count) and is left AS-IS — renaming a column that
-- shipping beta clients depend on would break compat. `activations` already
-- provides the device slots + self-service deactivate (is_active=false), so it
-- needs no change here.

-- 1. Add entitlement columns to the licenses table.
ALTER TABLE licenses
    -- Major-version entitlement. "1" = entitled to v1.x auto-updates only.
    -- A future paid v2 issues/updates licenses to "2". NOT NULL + DEFAULT '1'
    -- backfills every existing beta license to v1 automatically.
    ADD COLUMN IF NOT EXISTS version_entitlement TEXT NOT NULL DEFAULT '1',
    -- Commercial tier label (informational): 'beta' | 'founding' | 'standard' | 'admin'.
    ADD COLUMN IF NOT EXISTS tier TEXT,
    -- Trial expiry for trial licenses; NULL for paid/permanent licenses.
    ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- 2. Backfill is handled by the NOT NULL DEFAULT above for version_entitlement.
--    Tag the existing pooled/beta licenses as 'beta' tier where unset so the
--    tier column is meaningful from day one (safe: only fills NULLs).
UPDATE licenses SET tier = 'beta' WHERE tier IS NULL;

-- 3. Keep the pool generator forward-compatible. New pooled licenses inherit
--    version_entitlement='1' from the column default; make tier explicit so the
--    pool is self-describing. (CREATE OR REPLACE — safe to re-run.)
CREATE OR REPLACE FUNCTION generate_licenses(count INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    generated INTEGER := 0;
BEGIN
    FOR i IN 1..count LOOP
        INSERT INTO licenses (license_key, is_active, max_activations, tier, version_entitlement)
        VALUES (gen_random_uuid()::TEXT, true, 2, 'beta', '1');
        generated := generated + 1;
    END LOOP;

    RETURN generated;
END;
$$ LANGUAGE plpgsql;

-- 4. Verification (run manually after applying — expect version_entitlement='1'
--    for every existing row, i.e. no NULLs and no lockouts):
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE version_entitlement = '1') AS v1_entitled,
--          count(*) FILTER (WHERE version_entitlement IS NULL) AS null_entitlement
--   FROM licenses;
