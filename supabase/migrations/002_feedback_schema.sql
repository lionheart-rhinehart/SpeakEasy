-- Migration: Feedback Schema
-- Creates feedback table for beta tester feedback

-- 1. Create feedback status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_status') THEN
        CREATE TYPE feedback_status AS ENUM ('new', 'replied', 'resolved');
    END IF;
END $$;

-- 2. Create feedback category enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_category') THEN
        CREATE TYPE feedback_category AS ENUM ('bug', 'feature', 'general');
    END IF;
END $$;

-- 3. Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User identification (nullable for anonymous feedback)
    license_key TEXT,
    user_email TEXT,
    user_name TEXT,

    -- Feedback content
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('bug', 'feature', 'general')),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::JSONB,  -- Array of storage URLs
    video_url TEXT,  -- Loom or other video link

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'resolved')),
    replied_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    -- Metadata
    app_version TEXT,
    os_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_feedback_license_key ON feedback(license_key);

-- 5. Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feedback_updated_at ON feedback;
CREATE TRIGGER feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- 6. Row Level Security policies

-- Enable RLS on feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all feedback (for admin panel)
CREATE POLICY "Service role can manage feedback" ON feedback
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow anon to insert feedback (from app)
CREATE POLICY "Anon can insert feedback" ON feedback
    FOR INSERT
    WITH CHECK (true);

-- Policy: Users can read their own feedback by license key
CREATE POLICY "Users can read own feedback" ON feedback
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR license_key = current_setting('request.jwt.claims', true)::json->>'license_key'
    );

-- 7. Create Supabase Storage bucket for feedback attachments
-- Note: This needs to be done via Supabase Dashboard or API
-- The bucket should be named: feedback-attachments
-- Settings: Public = false, file size limit = 10MB

-- 8. Helper function to get feedback stats
CREATE OR REPLACE FUNCTION get_feedback_stats()
RETURNS TABLE (
    total_count BIGINT,
    new_count BIGINT,
    replied_count BIGINT,
    resolved_count BIGINT,
    bug_count BIGINT,
    feature_count BIGINT,
    general_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_count,
        COUNT(*) FILTER (WHERE status = 'new')::BIGINT as new_count,
        COUNT(*) FILTER (WHERE status = 'replied')::BIGINT as replied_count,
        COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT as resolved_count,
        COUNT(*) FILTER (WHERE category = 'bug')::BIGINT as bug_count,
        COUNT(*) FILTER (WHERE category = 'feature')::BIGINT as feature_count,
        COUNT(*) FILTER (WHERE category = 'general')::BIGINT as general_count
    FROM feedback;
END;
$$ LANGUAGE plpgsql;

-- 9. Helper function to get admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
    total_signups BIGINT,
    active_licenses BIGINT,
    available_licenses BIGINT,
    total_feedback BIGINT,
    new_feedback BIGINT,
    signups_today BIGINT,
    feedback_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM beta_signups)::BIGINT as total_signups,
        (SELECT COUNT(*) FROM activations WHERE is_active = true)::BIGINT as active_licenses,
        (SELECT COUNT(*) FROM licenses WHERE assigned_to_email IS NULL AND is_active = true)::BIGINT as available_licenses,
        (SELECT COUNT(*) FROM feedback)::BIGINT as total_feedback,
        (SELECT COUNT(*) FROM feedback WHERE status = 'new')::BIGINT as new_feedback,
        (SELECT COUNT(*) FROM beta_signups WHERE DATE(created_at) = CURRENT_DATE)::BIGINT as signups_today,
        (SELECT COUNT(*) FROM feedback WHERE DATE(created_at) = CURRENT_DATE)::BIGINT as feedback_today;
END;
$$ LANGUAGE plpgsql;
