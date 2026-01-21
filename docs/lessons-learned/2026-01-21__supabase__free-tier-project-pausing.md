# Supabase Free Tier Project Pausing

**Area:** Supabase / Infrastructure
**Date:** 2026-01-21
**Tags:** supabase, infrastructure, free-tier, keep-alive

## Summary

Supabase free tier projects pause after 7 days of inactivity, causing app connectivity issues that may appear as network or code bugs.

## Problem

SpeakEasy showed "Offline Mode" banner. License validation was failing silently. Initial investigation suggested network issues or code bugs, but the root cause was the Supabase project being paused due to inactivity.

## Solution

1. **Immediate fix:** Unpause project in Supabase dashboard (Settings > General > Restore project)
2. **Prevention:** Added keep-alive infrastructure:
   - Edge Function: `supabase/functions/keep-alive/index.ts`
   - GitHub Actions workflow: `.github/workflows/supabase-keepalive.yml`
   - Runs every 6 hours to keep project active

## Prevention

- For any Supabase free-tier project, add a keep-alive mechanism if the app doesn't have consistent daily traffic
- Consider upgrading to Pro tier for production apps (no pausing)
- Add monitoring/alerting for Supabase connectivity issues

## References

- [Supabase Free Tier Limits](https://supabase.com/docs/guides/platform/org-based-billing#project-pausing)
- Files: `supabase/functions/keep-alive/`, `.github/workflows/supabase-keepalive.yml`
