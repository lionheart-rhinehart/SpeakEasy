# Bug #08: Duplicate Process/Task Manager Entries from Autostart

**Severity:** Critical  
**Status:** ✅ FIXED  
**Date Discovered:** 2025-12-16  
**Date Fixed:** 2025-12-16

## Summary
Two separate `SpeakEasy.exe` processes appeared in Windows Task Manager after recent releases, despite only one instance being intended. This created confusion and potential resource waste.

## Root Cause
The issue was **NOT** caused by Tauri's multi-process architecture (Core + WebView), but rather by **lack of single-instance enforcement**:

1. **Autostart plugin** was configured to launch the app with `--minimized` flag on Windows startup
2. User manually launching the app (via Desktop shortcut or Start Menu) created a **second independent instance**
3. Both instances ran simultaneously because there was no single-instance lock

### Evidence
```powershell
ProcessId       : 18488
CommandLine     : "C:\Users\lionh\OneDrive\Desktop\speakeasy.exe" --minimized
ParentProcessId : 10044

ProcessId       : 12844
CommandLine     : "C:\Users\lionh\OneDrive\Desktop\speakeasy.exe" 
ParentProcessId : 10044
```

Different start times confirmed they were separate launches:
- 18488: Started 12/14/2025 @ 10:44:51 PM (autostart)
- 12844: Started 12/15/2025 @ 2:33:51 PM (manual)

## Impact
- Doubled memory/CPU usage
- Two system tray icons (confusing UX)
- Potential conflicts with global hotkeys
- User confusion about which instance is active

## Solution Implemented
Added **Tauri Single Instance Plugin** (`tauri-plugin-single-instance v2.3.6`):

### Changes Made

#### 1. Installed Plugin
```bash
npm run tauri add single-instance
```

#### 2. Configured in `src-tauri/src/lib.rs`
```rust
.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
    // When a second instance tries to start, focus the existing instance
    log::info!("Second instance attempted with args: {:?}, cwd: {}", args, cwd);
    
    // If the second instance was NOT started with --minimized, show the main window
    let should_show = !args.iter().any(|arg| arg == "--minimized");
    
    if should_show {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
            log::info!("Focused existing instance's main window");
        }
    } else {
        log::info!("Second instance with --minimized flag; keeping window hidden");
    }
}))
```

#### 3. Added `--minimized` Flag Handling
```rust
// Handle --minimized flag: if present, hide the main window
let args: Vec<String> = std::env::args().collect();
let is_minimized = args.iter().any(|arg| arg == "--minimized");

if is_minimized {
    log::info!("Started with --minimized flag, hiding main window");
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}
```

## Verification
After fix:
- Only **one** `SpeakEasy.exe` process appears in Task Manager
- Attempting to launch a second instance focuses the existing window (if not minimized)
- Autostart with `--minimized` works correctly without creating duplicate

## Prevention
- Single-instance plugin is now registered as the **first** plugin (priority)
- Comprehensive logging added to track instance attempts
- Future releases must test:
  1. Launch app normally
  2. Simulate autostart with `--minimized`
  3. Verify only one Task Manager entry

## Related Files
- `src-tauri/src/lib.rs` - Plugin configuration
- `src-tauri/Cargo.toml` - Added dependency

## Lessons Learned
See: `lessons-learned/2025-12-16__fix__duplicate-process-single-instance.md`
