# Tauri CI: Must Build Frontend Before Cargo Build

**Date:** 2026-03-13
**Area:** DevOps / CI
**Tags:** tauri, github-actions, ci, build

## Summary

Tauri's `generate_context!()` Rust macro validates at compile time that the `frontendDist` path (configured in `tauri.conf.json`) exists on disk. If the frontend hasn't been built, `cargo build` fails with a proc macro panic — not a missing file error, making it non-obvious.

## Problem

The "Single Instance Process Test" GitHub Actions workflow ran `cargo build --release` without first running `npm run build`. The `../dist` folder didn't exist, causing:

```
error: proc macro panicked
  --> src/lib.rs:302:14
   |
302 |         .run(tauri::generate_context!())
   |              ^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: message: The `frontendDist` configuration is set to `"../dist"` but this path doesn't exist
```

This had been silently failing on every push for weeks.

## Solution

Added `npm run build` step to the workflow between `npm ci` and `cargo build`:

```yaml
- name: Build frontend
  run: npm run build
- name: Build release
  run: cargo build --release --manifest-path src-tauri/Cargo.toml
```

## Prevention

- Any CI workflow that compiles Tauri must build the frontend first
- Tauri's compile-time checks mean you can't skip the frontend even for backend-only CI jobs
- Review new workflows for this dependency when adding them
