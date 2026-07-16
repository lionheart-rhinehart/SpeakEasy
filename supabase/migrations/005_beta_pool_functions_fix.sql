-- Migration 005: Fix beta license-pool functions
--
-- Context (applied live to project bzhxcinrsgcnmktouqdw on 2026-07-16):
-- The beta signup pipeline (beta-site + register-beta-tester edge function) was
-- never functional because the pool functions were wrong/missing in the live DB:
--   1. generate_licenses() from migration 001 inserted gen_random_uuid()::TEXT into
--      licenses.license_key, which is a UUID column -> ERROR 42804 (uuid vs text),
--      so it minted zero keys.
--   2. get_available_license() and count_available_licenses() (defined in 001) were
--      not present in the live DB (001 only partially applied).
-- This migration makes all three correct and idempotent so a rebuild from the repo
-- matches production. (Pool minting + dev-key reservation are one-off data ops, not
-- schema, and are intentionally NOT included here.)

-- Correct: license_key is uuid; insert a uuid, not text.
CREATE OR REPLACE FUNCTION generate_licenses(count INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE generated INTEGER := 0;
BEGIN
    FOR i IN 1..count LOOP
        INSERT INTO licenses (license_key, is_active, max_activations, tier, version_entitlement)
        VALUES (gen_random_uuid(), true, 2, 'beta', '1');
        generated := generated + 1;
    END LOOP;
    RETURN generated;
END;
$$ LANGUAGE plpgsql;

-- Pull the oldest unassigned, active license and lock it (used by register-beta-tester).
CREATE OR REPLACE FUNCTION get_available_license()
RETURNS UUID AS $$
DECLARE available_license_id UUID;
BEGIN
    SELECT id INTO available_license_id
    FROM licenses
    WHERE assigned_to_email IS NULL
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    RETURN available_license_id;
END;
$$ LANGUAGE plpgsql;

-- Count assignable licenses remaining in the pool.
CREATE OR REPLACE FUNCTION count_available_licenses()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM licenses
        WHERE assigned_to_email IS NULL
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;
