# Supabase Setup for SpeakEasy Beta

This directory contains SQL migrations and Edge Functions for the beta launch system.

## Setup Instructions

### 1. Run Database Migrations

Go to your Supabase Dashboard → SQL Editor and run each migration in order:

1. **001_beta_signup_schema.sql** - Adds beta signup tracking to licenses table
2. **002_feedback_schema.sql** - Creates feedback table and helper functions

### 2. Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named: `feedback-attachments`
3. Settings:
   - Public: **No** (private bucket)
   - File size limit: **10 MB**
   - Allowed MIME types: `image/*`, `video/*`, `application/pdf`

### 3. Set Up Secrets

Go to Supabase Dashboard → Settings → Secrets and add:

| Secret Name | Description |
|-------------|-------------|
| `RESEND_API_KEY` | Your Resend API key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `ADMIN_EMAIL` | Your email for notifications |
| `ADMIN_PASSWORD` | Password for admin panel login |

### 4. Deploy Edge Functions

You can deploy Edge Functions via Supabase CLI or Dashboard:

#### Option A: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy register-beta-tester
supabase functions deploy resend-license-key
supabase functions deploy check-license-pool
```

#### Option B: Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. Click "New Function"
3. Copy the code from each function directory
4. Deploy

### 5. Set Up Scheduled Function (Optional)

To auto-replenish the license pool:

1. Go to Supabase Dashboard → Database → Extensions
2. Enable `pg_cron` extension
3. Run this SQL:

```sql
-- Check license pool every hour and generate more if low
SELECT cron.schedule(
    'check-license-pool',
    '0 * * * *',  -- Every hour
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-license-pool',
        headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
    $$
);
```

## File Structure

```
supabase/
├── migrations/
│   ├── 001_beta_signup_schema.sql  # Licenses + beta signups
│   └── 002_feedback_schema.sql     # Feedback table
├── functions/
│   ├── register-beta-tester/       # Beta signup endpoint
│   │   └── index.ts
│   ├── resend-license-key/         # Resend key endpoint
│   │   └── index.ts
│   └── check-license-pool/         # Pool management
│       └── index.ts
└── README.md
```

## Testing

After setup, test the functions:

```bash
# Test registration (replace with your values)
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/register-beta-tester \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "turnstile_token": "test"}'

# Test resend
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/resend-license-key \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```
