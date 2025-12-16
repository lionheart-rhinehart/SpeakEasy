# 2025-12-16: Fixed Duplicate Process Issue with Single-Instance Plugin

**Category:** Fix  
**Tags:** #tauri #windows #autostart #process-management #single-instance

## Problem
Two separate `SpeakEasy.exe` processes appeared in Windows Task Manager, causing resource waste and user confusion.

## Initial Hypothesis (INCORRECT)
Initially suspected Tauri's multi-process architecture (Core + WebView) was creating duplicate tasks.

## Actual Root Cause
**Lack of single-instance enforcement** combined with autostart functionality:
1. Autostart plugin launches app with `--minimized` on Windows startup
2. User manually launches app later (Desktop shortcut)
3. Both instances run simultaneously - no lock preventing duplicates

## Solution
Implemented **Tauri Single Instance Plugin** with smart behavior:
- First instance runs normally
- Subsequent attempts focus existing window (unless `--minimized` flag present)
- Proper handling of autostart vs. manual launch scenarios

## Key Implementation Details

### 1. Plugin Registration (MUST BE FIRST)
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
        // Handler for second instance attempts
    }))
    .plugin(tauri_plugin_shell::init())
    // ... other plugins
```

**Why first?** Ensures lock is acquired before other plugins initialize.

### 2. Smart Window Focusing
```rust
let should_show = !args.iter().any(|arg| arg == "--minimized");

if should_show {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
```

**Logic:** Only show window if second attempt wasn't autostart (which uses `--minimized`).

### 3. Autostart Minimized Support
```rust
let args: Vec<String> = std::env::args().collect();
let is_minimized = args.iter().any(|arg| arg == "--minimized");

if is_minimized {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}
```

**Purpose:** First instance launched by autostart should stay hidden in tray.

## What Didn't Work

### ❌ Approach 1: Removing Static Windows
- Removing overlay/status windows from `tauri.conf.json`
- **Verdict:** Not the issue; overlays use `skipTaskbar: true`

### ❌ Approach 2: Tauri Multi-Process Flag
- Setting `windows.multiProcess = false` 
- **Verdict:** Not applicable; issue was duplicate *instances*, not processes

## Testing Checklist
- [x] Launch app normally → Only 1 process
- [x] Launch second time → Focuses existing window
- [x] Launch with `--minimized` → Starts hidden
- [x] Autostart + manual launch → Only 1 process, shows window
- [x] Task Manager shows single `SpeakEasy.exe` entry

## Commands for Verification
```powershell
# Check running instances
Get-Process -Name "speakeasy" | Select-Object Id, ProcessName, StartTime

# Check command line arguments
Get-CimInstance Win32_Process -Filter "name='SpeakEasy.exe'" | Select-Object ProcessId, CommandLine

# Test autostart behavior
Start-Process -FilePath "path\to\speakeasy.exe" -ArgumentList "--minimized"

# Test duplicate prevention
Start-Process -FilePath "path\to\speakeasy.exe"
Start-Process -FilePath "path\to\speakeasy.exe"  # Should focus existing
```

## Dependencies Added
```toml
[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
tauri-plugin-single-instance = "2"
```

## Prevention Strategies
1. **Always test autostart scenarios** in release builds
2. **Monitor Task Manager** during QA for unexpected duplicates
3. **Log instance attempts** for debugging production issues
4. **Document `--minimized` flag** behavior in README

## Related Bug Reports
- `bug-analysis/critical/08-duplicate-process-autostart-conflict.md`

## Resources
- [Tauri Single Instance Plugin Docs](https://v2.tauri.app/plugin/single-instance/)
- [Windows Task Manager Process Debugging](https://learn.microsoft.com/en-us/windows/win32/procthread/processes-and-threads)

## Time Investment
- Investigation: 1 hour
- Implementation: 30 minutes
- Testing & Documentation: 30 minutes
- **Total: 2 hours**

## Success Metrics
- ✅ Single process in Task Manager
- ✅ Proper window focus on duplicate launch
- ✅ Autostart `--minimized` works correctly
- ✅ No resource waste from duplicate instances
