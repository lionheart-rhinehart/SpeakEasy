# Auto-Updates, File Logging & Beta Distribution

**Date:** 2026-03-13
**Area:** devops
**Tags:** logging, auto-updates, tauri-plugin-log, env_logger, signing, beta-testing

## Summary

Enabled auto-updates and file logging for SpeakEasy v1.0.1 to solve two critical beta distribution problems: no way to diagnose user issues remotely (no log files on disk), and no way to push fixes without manually sending new installers.

## Problems & Solutions

### 1. Double-Logger Panic (CRITICAL)

**Problem:** Adding `tauri-plugin-log` while `env_logger::init()` was still in `main.rs` caused a panic. The `log` crate only allows ONE global logger — the second `log::set_boxed_logger()` call panics. The app wouldn't launch at all, and Ivan installed this broken version.

**Solution:** Remove `env_logger::init()` from `main.rs` AND remove `env_logger` from `Cargo.toml` entirely. Only `tauri-plugin-log` should exist as the logger backend.

**Prevention:** When swapping logging backends, always grep the entire codebase for the old logger's initialization call before building.

### 2. env_logger Is Invisible on Windows GUI Apps

**Problem:** `env_logger` only writes to stderr. Windows apps built with `#![windows_subsystem = "windows"]` have no console — stderr goes nowhere. Log files were never created on disk. Beta testers had zero diagnostic information.

**Solution:** `tauri-plugin-log` with `TargetKind::LogDir` writes to `%LOCALAPPDATA%\com.speakeasy.app\logs\SpeakEasy.log`. Also kept `TargetKind::Stdout` for dev mode.

**Key insight:** Always verify your logging actually produces files on disk for release builds. Console-only logging is useless for GUI apps.

### 3. Single-Instance Plugin Hides New Builds

**Problem:** After fixing the logger, log file was 0 bytes after 8+ seconds of runtime. Root cause: the OLD installed version (without logging) was still running as a background process. Tauri's `single-instance` plugin silently redirected all new launch attempts to the old process. Our new build with logging never actually executed its `setup()` block.

**Solution:** `powershell "Stop-Process -Name speakeasy -Force"` to kill the old instance before launching the new build. After that, logs appeared immediately (7,288 bytes, 18 lines).

**Prevention:** When testing new builds of a single-instance app, ALWAYS kill existing processes first. `tasklist /fi "imagename eq speakeasy.exe"` to check, then kill before launching.

**Gotcha:** `taskkill /f /im speakeasy.exe` from Git Bash may fail silently. Use `powershell Stop-Process` instead.

### 4. Tauri Updater Requires All Three Version Files in Sync

**Problem:** Tauri reads version from `tauri.conf.json`, but `Cargo.toml` and `package.json` must also match. The `tauri-action` GitHub Action uses the version from config files, NOT from the git tag. If files say "1.0.0" but tag is "v1.0.1", the built binary reports as "1.0.0".

**Solution:** Always bump version in all three files simultaneously:
- `package.json` → `"version": "1.0.1"`
- `src-tauri/tauri.conf.json` → `"version": "1.0.1"`
- `src-tauri/Cargo.toml` → `version = "1.0.1"`

### 5. First Manual Install Is Unavoidable

**Problem:** v1.0.0 has an empty updater `pubkey`, so it can never verify signed updates. Auto-updates only work starting from a version that has the pubkey.

**Solution:** v1.0.1 is the LAST manual install. It contains the pubkey, so all future versions (v1.0.2+) will auto-update. Accept this one-time bootstrap cost.

### 6. Plugin Order Matters for Log Capture

**Problem:** If `tauri-plugin-log` is registered AFTER other plugins, their initialization logs are lost.

**Solution:** Register `tauri-plugin-log` as the FIRST plugin in `tauri::Builder::default()`, before `single-instance`, `autostart`, etc. This captures everything including the checks that might fail on user machines.

## References

- Log location: `%LOCALAPPDATA%\com.speakeasy.app\logs\SpeakEasy.log`
- Signing key: `~/.tauri/SpeakEasy.key` (NEVER commit)
- GitHub Secrets: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- Updater endpoint: `https://github.com/lionheart-rhinehart/SpeakEasy/releases/latest/download/latest.json`
