-- Migration: Beta Signup Schema
-- Adds columns to licenses table and creates beta_signups table

-- 1. Add columns to existing licenses table for beta assignment tracking
ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS assigned_to_email TEXT,
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Create index for faster lookups by assigned email
CREATE INDEX IF NOT EXISTS idx_licenses_assigned_to_email ON licenses(assigned_to_email);

-- 2. Create beta_signups table to track registrations
CREATE TABLE IF NOT EXISTS beta_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    license_id UUID REFERENCES licenses(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email_sent_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);

-- Create indexes for beta_signups
CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON beta_signups(email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_created_at ON beta_signups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_signups_license_id ON beta_signups(license_id);

-- 3. Row Level Security policies

-- Enable RLS on beta_signups
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Edge Functions (service role) to insert/update/select
CREATE POLICY "Service role can manage beta_signups" ON beta_signups
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow anon to insert (for public signup)
CREATE POLICY "Anon can insert beta_signups" ON beta_signups
    FOR INSERT
    WITH CHECK (true);

-- Policy: Deny public reads (protect user data)
CREATE POLICY "Deny public reads on beta_signups" ON beta_signups
    FOR SELECT
    USING (auth.role() = 'service_role');

-- 4. Function to get an available license from the pool
CREATE OR REPLACE FUNCTION get_available_license()
RETURNS UUID AS $$
DECLARE
    available_license_id UUID;
BEGIN
    -- Select first available (unassigned) license and lock it
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

-- 5. Function to count available licenses in pool
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

-- 6. Function to generate new license keys (UUIDs)
CREATE OR REPLACE FUNCTION generate_licenses(count INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    generated INTEGER := 0;
BEGIN
    FOR i IN 1..count LOOP
        INSERT INTO licenses (license_key, is_active, max_activations)
        VALUES (gen_random_uuid()::TEXT, true, 2);
        generated := generated + 1;
    END LOOP;

    RETURN generated;
END;
$$ LANGUAGE plpgsql;

-- 7. Pre-generate initial batch of 50 licenses
-- (Only run if pool is empty)
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM licenses WHERE assigned_to_email IS NULL) < 10 THEN
        PERFORM generate_licenses(50);
        RAISE NOTICE 'Generated 50 new licenses';
    END IF;
END $$;
