# Tauri CI Signing Pipeline — 7 Failure Modes

## Summary
v1.0.3 release failed 3 times (~17 min each) before we identified and fixed all 7 failure modes in the CI signing pipeline. Key insight: test every CI command locally before pushing, because each CI cycle costs 17 minutes of Rust compilation.

## Problems & Solutions

### 1. Signing key had unknown password
- **Problem:** Original key generated without documenting the password. `npx tauri signer sign -k KEY -p "" file` → "Wrong password"
- **Fix:** Regenerated key with known password: `npx tauri signer generate -w ~/.tauri/SpeakEasy.key -f -p "speakeasy" --ci`
- **Prevention:** Always document signing key passwords in a password manager immediately after generation

### 2. `tauri-apps/tauri-action@v0` silently skips signing
- **Problem:** Despite setting `TAURI_SIGNING_PRIVATE_KEY` env var, the action outputs "Finished 2 bundles" (only .exe and .msi) — no .sig files. "Signature not found for the updater JSON. Skipping upload..."
- **Fix:** Added a manual post-build signing step instead of relying on tauri-action
- **Prevention:** Don't trust GitHub Actions to handle signing — verify by checking build output for .sig files

### 3. `-k` flag fails with "Missing comment in secret key"
- **Problem:** `npx tauri signer sign -k "$(cat key)" file` can't parse the base64 key blob as a string argument
- **Fix:** Write key to temp file, use `-f` flag instead: `npx tauri signer sign -f "$KEY_FILE" ...`
- **Prevention:** Always use `-f` (file) flag for Tauri signer, never `-k` (string)

### 4. `echo` adds trailing newline breaking base64
- **Problem:** `echo "$KEY" > file` produces 349 bytes (original is 348). Signer fails with "Invalid symbol 10, offset 348"
- **Fix:** `printf '%s' "$KEY" > file` — no trailing newline
- **Prevention:** Always use `printf '%s'` when writing binary/base64 data to files in bash

### 5. `7z` not reliably available on windows-latest runners
- **Problem:** GitHub removed 7z from some runner images (issues #9361, #905)
- **Fix:** Use PowerShell `Compress-Archive` instead — guaranteed on Windows runners
- **Prevention:** Prefer built-in tools (PowerShell) over third-party tools (7z) in CI

### 6. `7z` preserves relative directory structure in zip
- **Problem:** `7z a -tzip out.zip src-tauri/target/.../file.exe` creates zip with nested directories. Tauri updater expects exe at zip root.
- **Fix:** `Compress-Archive -Path` stores only the leaf filename — exe always at zip root
- **Prevention:** Always verify zip contents after creation: `unzip -l file.zip`

### 7. Pubkey mismatch after key regeneration
- **Problem:** Regenerating signing key changes the pubkey. Old app versions have old pubkey baked in, can't verify new signatures.
- **Impact:** Auto-update from v1.0.1/v1.0.2 → v1.0.3 fails silently. Manual install required.
- **Prevention:** Never regenerate signing keys unless absolutely necessary. If you must, accept that existing installs need manual update.

## Local Testing Commands (Verified)
```bash
# Write key without trailing newline
printf '%s' "$KEY" > tmpfile                     # 348 bytes ✅

# Sign with file flag
npx tauri signer sign -f tmpfile -p "speakeasy" setup.exe    # ✅

# Create zip with exe at root
powershell -Command "Compress-Archive -Path 'setup.exe' -DestinationPath 'out.zip' -Force"  # ✅
```

## Meta-Lesson
Each CI cycle for a Tauri app costs ~17 minutes (Rust compilation). Always test CI commands locally against real artifacts before pushing. The 30 minutes spent testing locally saved potentially 3+ more CI cycles (51+ minutes).

## References
- `.github/workflows/release.yml` — the signing step
- `src-tauri/tauri.conf.json:118` — updater endpoint and pubkey
- `~/.tauri/SpeakEasy.key` — signing key location
