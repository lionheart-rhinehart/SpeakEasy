# Lessons Learned

## Environment & Tooling
- Tauri builds require Rust (`cargo`) and must have the toolchain on PATH before invoking `tauri build`.
- Windows targets need the Visual C++ Build Tools (`cl.exe`, `link.exe`) plus the Windows SDK; installing via `winget` is the fastest path.
- After installing tooling, reopen terminals so the updated PATH is picked up.

## Build & Release
- `npm run tauri:build` bundles both the Vite frontend and the Rust backend; keep an eye on warnings for unused code.
- Build artifacts land under `src-tauri/target/release` (`.exe`, `.msi`, `.exe` installer), so they’re easy to grab for testing and distribution.

## Autostart Behavior
- `tauri-plugin-autostart` writes to `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`; verifying the entry confirms the toggle worked.
- The plugin passes `--minimized`; the app should parse CLI args and hide the main window when starting from autostart.
- Testing autostart properly requires a reboot/logon cycle; running the exe manually with `--minimized` is a quicker smoke test.

## Process Notes
- Keep plan documents under `plan/` (or related folders) so troubleshooting steps remain discoverable.
- Document fixes immediately while the context is fresh—future you will thank you.
