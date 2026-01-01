# macOS Port Plan for SpeakEasy

> **Last Updated:** 2026-01-01
> **Status:** Awaiting Approval
> **Branch:** `feature/macos-support` (to be created)

---

## Executive Summary

Port SpeakEasy to macOS. The frontend is platform-agnostic. The Rust backend requires targeted changes for 6 areas. One **build blocker** must be fixed before any macOS compilation will succeed.

---

## Repository Strategy

**Decision:** Single repo with CI gate (Option 3)

### Why This Approach

- **Single codebase** - Both platforms build from the same repo
- **CI protection** - Every PR must build on BOTH Windows and macOS before merge
- **Shared code stays shared** - ~85% of code is platform-agnostic
- **Platform code is isolated** - Uses `#[cfg(target_os = "...")]` conditional compilation
- **Can't accidentally break the other platform** - CI blocks bad merges

### Branch Strategy

```
main (stable, both platforms work)
  └── feature/macos-support (initial macOS development)
        └── merge to main when macOS is working

After merge: main builds both platforms, CI guards everything
```

### The Safety Net

```yaml
# On every PR:
- Build Windows → must pass
- Build macOS  → must pass
- Either fails → PR blocked → can't merge
```

This is how Tauri, Electron, Flutter, and React Native projects all work. The CI is your protection.

---

## Current Platform Support Matrix

| Component | Windows | macOS | Notes |
|-----------|---------|-------|-------|
| Frontend (React/TS) | ✅ | ✅ | Platform-agnostic |
| Audio Recording (cpal) | ✅ | ✅ | Cross-platform library |
| Audio Playback (rodio) | ✅ | ✅ | Cross-platform library |
| Clipboard Read/Write (arboard) | ✅ | ✅ | Cross-platform library |
| Credential Storage (keyring) | ✅ | ✅ | Uses macOS Keychain |
| Config Paths (dirs) | ✅ | ✅ | Platform-aware |
| Machine ID | ✅ | ✅ | Uses `ioreg` on macOS (already implemented) |
| Autostart | ✅ | ✅ | Uses LaunchAgent on macOS (already configured) |
| Global Hotkeys | ✅ | ✅ | Tauri plugin handles it |
| System Tray | ✅ | ✅ | Tauri plugin handles it |
| **Input Simulation (paste/copy)** | ✅ | ❌ | Uses Ctrl, needs Cmd |
| **Chrome Profile Discovery** | ✅ | ❌ | Windows paths only |
| **Window Z-Order Enforcement** | ✅ | ⚠️ | No-op stub, needs testing |
| **Build Configuration** | ✅ | ❌ | No macOS bundle config |
| **Cargo Dependencies** | ✅ | ❌ | `clipboard-win` blocks build |
| **Permissions (Info.plist)** | N/A | ❌ | Missing microphone/accessibility strings |

---

## Implementation Tasks

### Phase 0: Build Blockers (MUST DO FIRST)

These prevent macOS from compiling at all.

---

#### Task 0.1: Fix `clipboard-win` Conditional Compilation

**File:** `src-tauri/Cargo.toml`
**Priority:** P0 - BLOCKING
**Complexity:** Low (5 min)

**Problem:** `clipboard-win = "5"` is listed as an unconditional dependency (line 33). This Windows-only crate will fail to compile on macOS.

**Current (line 33):**
```toml
clipboard-win = "5"
```

**Fix:** Move to Windows-specific dependencies section. Delete line 33 and add to the existing `[target.'cfg(windows)'.dependencies]` section (after line 84):

```toml
[target.'cfg(windows)'.dependencies]
windows = { version = "0.58", features = [
    "Win32_UI_Input_KeyboardAndMouse",
    "Win32_UI_WindowsAndMessaging",
    "Win32_Foundation",
    "Win32_UI_Shell"
] }
clipboard-win = "5"  # ADD THIS LINE
```

**Verification:** `cargo check --target x86_64-apple-darwin` should not fail on clipboard-win.

---

#### Task 0.2: Create CI Workflow for Cross-Platform Protection

**File:** `.github/workflows/ci.yml` (new file)
**Priority:** P0 - FOUNDATIONAL SAFETY
**Complexity:** Low (15 min)

**Purpose:** This is the safety net that prevents Windows changes from breaking macOS and vice versa. Every PR must pass builds on BOTH platforms before merge.

**Create `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main, feature/macos-support]
  pull_request:
    branches: [main]

jobs:
  build:
    strategy:
      fail-fast: false  # Don't cancel other builds if one fails
      matrix:
        include:
          - platform: windows-latest
            target: ''
          - platform: macos-latest
            target: 'aarch64-apple-darwin'

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - name: Install dependencies
        run: npm ci

      - name: Check Rust code
        run: cargo check --manifest-path src-tauri/Cargo.toml

      - name: Run Rust tests
        run: cargo test --manifest-path src-tauri/Cargo.toml

      - name: Build frontend
        run: npm run build

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Why `fail-fast: false`:** If Windows fails, we still want to see if macOS passes (and vice versa). Helps diagnose platform-specific issues.

**Verification:**
1. Push a PR
2. See both Windows and macOS builds run
3. Both must be green to merge

---

#### Task 0.3: Add macOS Info.plist Permission Strings

**File:** `src-tauri/tauri.conf.json`
**Priority:** P0 - BLOCKING
**Complexity:** Low (10 min)

**Problem:** macOS requires usage description strings for protected resources. Without these:
- Microphone access will be denied (app crashes or silent failure)
- Accessibility/input simulation will fail silently

**Add to `tauri.conf.json` inside the `bundle` section (after line 110):**

```json
"macOS": {
  "minimumSystemVersion": "10.15",
  "exceptionDomain": "",
  "signingIdentity": null,
  "entitlements": null,
  "infoPlist": {
    "NSMicrophoneUsageDescription": "SpeakEasy needs microphone access to record your voice for transcription.",
    "NSAppleEventsUsageDescription": "SpeakEasy needs accessibility access to paste transcribed text into other applications.",
    "LSApplicationCategoryType": "public.app-category.productivity"
  },
  "dmg": {
    "appPosition": { "x": 180, "y": 170 },
    "applicationFolderPosition": { "x": 480, "y": 170 },
    "windowSize": { "width": 660, "height": 400 }
  }
}
```

**Verification:** Build for macOS and verify Info.plist contains these keys.

---

### Phase 1: Core Functionality

These make the app actually work on macOS.

---

#### Task 1.1: Implement macOS Input Simulation (Cmd+V/C)

**File:** `src-tauri/src/clipboard.rs`
**Priority:** P1 - Critical
**Complexity:** Medium (30 min)
**Lines affected:** ~80 new lines

**Problem:** The `rdev` fallback uses `Key::ControlLeft` which doesn't work on macOS. macOS uses `Cmd` (Meta) for shortcuts.

**Implementation:**

**Step 1:** Add macOS-specific paste function after line 240:

```rust
/// macOS-specific paste using Cmd+V via rdev
#[cfg(target_os = "macos")]
fn simulate_paste_macos() -> Result<()> {
    use rdev::{simulate, EventType, Key};
    use std::thread;
    use std::time::Duration;

    // Press Cmd (Meta)
    simulate(&EventType::KeyPress(Key::MetaLeft))
        .map_err(|e| anyhow::anyhow!("Failed to press Cmd: {:?}", e))?;

    thread::sleep(Duration::from_millis(30));

    // Press V
    simulate(&EventType::KeyPress(Key::KeyV))
        .map_err(|e| anyhow::anyhow!("Failed to press V: {:?}", e))?;

    thread::sleep(Duration::from_millis(30));

    // Release V
    simulate(&EventType::KeyRelease(Key::KeyV))
        .map_err(|e| anyhow::anyhow!("Failed to release V: {:?}", e))?;

    thread::sleep(Duration::from_millis(30));

    // Release Cmd
    simulate(&EventType::KeyRelease(Key::MetaLeft))
        .map_err(|e| anyhow::anyhow!("Failed to release Cmd: {:?}", e))?;

    log::info!("Simulated paste keystroke via rdev (macOS Cmd+V)");
    Ok(())
}
```

**Step 2:** Add macOS-specific copy function after the paste function:

```rust
/// macOS-specific copy using Cmd+C via rdev
#[cfg(target_os = "macos")]
fn simulate_copy_macos() -> Result<()> {
    use rdev::{simulate, EventType, Key};
    use std::thread;
    use std::time::Duration;

    simulate(&EventType::KeyPress(Key::MetaLeft))
        .map_err(|e| anyhow::anyhow!("Failed to press Cmd: {:?}", e))?;

    thread::sleep(Duration::from_millis(20));

    simulate(&EventType::KeyPress(Key::KeyC))
        .map_err(|e| anyhow::anyhow!("Failed to press C: {:?}", e))?;

    thread::sleep(Duration::from_millis(20));

    simulate(&EventType::KeyRelease(Key::KeyC))
        .map_err(|e| anyhow::anyhow!("Failed to release C: {:?}", e))?;

    thread::sleep(Duration::from_millis(20));

    simulate(&EventType::KeyRelease(Key::MetaLeft))
        .map_err(|e| anyhow::anyhow!("Failed to release Cmd: {:?}", e))?;

    log::info!("Simulated copy keystroke via rdev (macOS Cmd+C)");
    Ok(())
}
```

**Step 3:** Update `simulate_paste()` (line 46) to call macOS version first:

Add this block at the beginning of the function, after the initial delay:

```rust
// On macOS, use Cmd+V directly
#[cfg(target_os = "macos")]
{
    return simulate_paste_macos();
}
```

**Step 4:** Update `simulate_copy()` (line 275) similarly:

Add this block at the beginning of the function, after the initial delay:

```rust
// On macOS, use Cmd+C directly
#[cfg(target_os = "macos")]
{
    return simulate_copy_macos();
}
```

**Verification:** On macOS, trigger paste - text should paste into target app.

**Note:** User must grant Accessibility permission in System Preferences → Security & Privacy → Privacy → Accessibility.

---

#### Task 1.2: Implement macOS Chrome Profile Discovery

**File:** `src-tauri/src/commands.rs`
**Priority:** P1 - Critical
**Complexity:** Medium (45 min)
**Lines affected:** ~60 new/modified lines

**Problem:** `get_chrome_user_data_dir()` only handles Windows paths (lines 1441-1501). `list_chrome_profiles()` returns an error on non-Windows (lines 1585-1589).

**Implementation:**

**Step 1:** Replace `get_chrome_user_data_dir()` (lines 1441-1501) with platform-aware version:

```rust
/// Get the Chrome User Data directory path (cross-platform)
fn get_chrome_user_data_dir() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        // PRIMARY: Use dirs crate (proven to work in Tauri)
        if let Some(local_data) = dirs::data_local_dir() {
            let path = local_data.join("Google").join("Chrome").join("User Data");
            log::info!("[Chrome] Trying dirs::data_local_dir(): {:?}", path);
            if path.exists() {
                if let Some(path_str) = path.to_str() {
                    log::info!("[Chrome] SUCCESS via dirs crate: {}", path_str);
                    return Some(path_str.to_string());
                }
            }
        }

        // FALLBACK 1: LOCALAPPDATA
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            let path = format!(r"{}\Google\Chrome\User Data", local);
            if std::path::Path::new(&path).exists() {
                return Some(path);
            }
        }

        // FALLBACK 2: USERPROFILE
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let path = format!(r"{}\AppData\Local\Google\Chrome\User Data", userprofile);
            if std::path::Path::new(&path).exists() {
                return Some(path);
            }
        }

        log::error!("[Chrome] Could not find Chrome User Data directory on Windows");
        None
    }

    #[cfg(target_os = "macos")]
    {
        // macOS Chrome location: ~/Library/Application Support/Google/Chrome
        if let Some(home) = dirs::home_dir() {
            let path = home
                .join("Library")
                .join("Application Support")
                .join("Google")
                .join("Chrome");
            log::info!("[Chrome] Trying macOS path: {:?}", path);
            if path.exists() {
                if let Some(path_str) = path.to_str() {
                    log::info!("[Chrome] SUCCESS on macOS: {}", path_str);
                    return Some(path_str.to_string());
                }
            }
        }
        log::warn!("[Chrome] Chrome not found on macOS");
        None
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        // Linux: ~/.config/google-chrome
        if let Some(config) = dirs::config_dir() {
            let path = config.join("google-chrome");
            if path.exists() {
                return path.to_str().map(|s| s.to_string());
            }
        }
        log::warn!("[Chrome] Chrome not found on Linux");
        None
    }
}
```

**Step 2:** Update `list_chrome_profiles()` (line 1509) to support macOS:

Change:
```rust
#[cfg(target_os = "windows")]
```

To:
```rust
#[cfg(any(target_os = "windows", target_os = "macos"))]
```

Update the error message at lines 1585-1588:
```rust
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
{
    log::warn!("Chrome profile listing not implemented for this platform");
    Err("Chrome profile listing is only supported on Windows and macOS".to_string())
}
```

**Step 3:** Update `open_url_in_chrome()` (around line 1606) - add macOS block before the non-Windows fallback:

Find the section that starts with `#[cfg(not(target_os = "windows"))]` and replace it with:

```rust
#[cfg(target_os = "macos")]
{
    let chrome_paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ];

    // Also check user's home Applications folder
    let mut all_paths: Vec<std::path::PathBuf> = chrome_paths
        .iter()
        .map(|p| std::path::PathBuf::from(p))
        .collect();

    if let Some(home) = dirs::home_dir() {
        all_paths.push(home.join("Applications/Google Chrome.app/Contents/MacOS/Google Chrome"));
    }

    for path in all_paths {
        if path.exists() {
            log::info!("[Chrome] Found Chrome at: {:?}", path);
            match std::process::Command::new(&path)
                .arg(format!("--profile-directory={}", profile))
                .arg(&url)
                .spawn()
            {
                Ok(_) => {
                    log::info!("[Chrome] Opened URL in Chrome profile '{}': {}", profile, url);
                    return Ok(());
                }
                Err(e) => {
                    log::warn!("[Chrome] Failed to launch Chrome: {}", e);
                }
            }
        }
    }

    // Fallback to default browser
    log::warn!("[Chrome] Chrome not found, falling back to default browser");
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))?;
    Ok(())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
{
    // Linux and other platforms: fall back to default browser
    log::info!("[Chrome] Non-Windows/macOS platform, using default browser");
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))?;
    Ok(())
}
```

**Verification:** On macOS with Chrome installed, `list_chrome_profiles` should return profiles.

---

### Phase 2: Build & Distribution

---

#### Task 2.1: Enable macOS CI Builds

**File:** `.github/workflows/release.yml`
**Priority:** P1 - Required for distribution
**Complexity:** Low (5 min)

**Uncomment lines 59-62:**

```yaml
          - platform: macos-latest
            args: '--target universal-apple-darwin'
            target: 'universal-apple-darwin'
```

**Add ARM64 target installation** (add after the Rust toolchain setup, around line 77):

```yaml
      - name: Add macOS ARM64 target
        if: matrix.platform == 'macos-latest'
        run: rustup target add aarch64-apple-darwin
```

---

#### Task 2.2: Verify Icon Generation

**Directory:** `src-tauri/icons/`
**Priority:** P2 - Polish
**Complexity:** Low (10 min)

**Current icons:**
- ✅ `icon.png` (source)
- ✅ `32x32.png`
- ✅ `128x128.png`
- ✅ `128x128@2x.png`
- ✅ `icon.ico` (Windows)
- ❌ `icon.icns` (macOS) - Missing

**Action:** Run `npm run tauri icon` to regenerate all icons including `.icns`.

If that command doesn't exist or fails, add to the CI workflow:
```yaml
      - name: Generate icons
        if: matrix.platform == 'macos-latest'
        run: npx tauri icon src-tauri/icons/icon.png
```

---

### Phase 3: Polish & UX (Optional for MVP)

---

#### Task 3.1: Test Window Z-Order on macOS

**File:** `src-tauri/src/window_topmost.rs`
**Priority:** P2 - May work already
**Complexity:** Unknown (testing required)

**Current state:**
- `alwaysOnTop: true` is set in `tauri.conf.json` for overlay windows (lines 37, 53, 68, 82)
- macOS functions are no-ops (lines 125-134)

**Test first:** The Tauri built-in `alwaysOnTop` may work on macOS without custom code.

**If it doesn't work, implement NSWindow level control:**

Add to `Cargo.toml` in a new macOS-specific section:
```toml
[target.'cfg(target_os = "macos")'.dependencies]
cocoa = "0.25"
objc = "0.2"
```

Replace macOS no-op in `window_topmost.rs` (lines 125-128):
```rust
#[cfg(target_os = "macos")]
pub fn apply_topmost_subclass(window: &tauri::WebviewWindow) -> Result<()> {
    use cocoa::base::id;
    use objc::msg_send;
    use objc::sel;
    use objc::sel_impl;
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};

    let handle = window.window_handle()
        .map_err(|e| anyhow::anyhow!("Failed to get window handle: {}", e))?;

    let ns_window: id = match handle.as_raw() {
        RawWindowHandle::AppKit(appkit_handle) => {
            appkit_handle.ns_window.as_ptr() as id
        }
        _ => return Err(anyhow::anyhow!("Not an AppKit window")),
    };

    unsafe {
        // NSFloatingWindowLevel = 3
        let _: () = msg_send![ns_window, setLevel: 3i64];
        log::info!("[window_topmost] Applied floating window level on macOS");
    }

    Ok(())
}
```

---

#### Task 3.2: Platform-Aware Tray Tooltip

**File:** `src-tauri/src/lib.rs`
**Priority:** P3 - Polish
**Complexity:** Low (5 min)

**Current (line 174):**
```rust
.tooltip("SpeakEasy - Press Ctrl+Space to record")
```

**Change to:**
```rust
.tooltip(if cfg!(target_os = "macos") {
    "SpeakEasy - Press ⌃Space to record"
} else {
    "SpeakEasy - Press Ctrl+Space to record"
})
```

---

#### Task 3.3: Document macOS Hotkey Conventions

**Priority:** P3 - Documentation
**Complexity:** Low (15 min)

The default hotkey `Control+Space` works on macOS but feels non-standard (Mac users expect Cmd).

**Add to README.md:**
```markdown
## macOS Users

The default recording hotkey is `Control+Space`. On macOS, you may prefer to customize this in Settings:

- **Recommended:** `Option+Space` (⌥Space) - doesn't conflict with Spotlight
- **Note:** `Cmd+Space` is reserved for Spotlight search and cannot be used

To change hotkeys, open SpeakEasy → Settings → Hotkeys.
```

---

## Testing Checklist

### Can Verify via CI (No Mac Required)

- [ ] Code compiles for `x86_64-apple-darwin`
- [ ] Code compiles for `aarch64-apple-darwin`
- [ ] Universal binary builds successfully
- [ ] DMG is created without errors
- [ ] No clippy warnings for macOS target

### Requires Mac Hardware

- [ ] App launches without crashes
- [ ] Microphone permission prompt appears
- [ ] Audio recording works after permission granted
- [ ] Audio playback (beeps) work
- [ ] Accessibility permission prompt appears (or check System Preferences)
- [ ] Cmd+V paste works after permission granted
- [ ] Cmd+C copy works after permission granted
- [ ] Global hotkeys register and trigger
- [ ] Recording overlay appears and stays on top
- [ ] System tray icon appears and menu works
- [ ] Chrome profile detection works (if Chrome installed)
- [ ] Opening URLs in Chrome with profile works
- [ ] Settings persist across app restarts
- [ ] Autostart via LaunchAgent works
- [ ] App update mechanism works

### Test Matrix

| macOS Version | Architecture | Priority |
|---------------|--------------|----------|
| Sonoma (14.x) | Apple Silicon (M1/M2/M3) | High |
| Ventura (13.x) | Apple Silicon | Medium |
| Monterey (12.x) | Intel | Medium |
| Big Sur (11.x) | Intel | Low |

---

## Distribution Notes

### Unsigned App (No Apple Developer Account)

Users must bypass Gatekeeper:

**Method 1 (GUI):**
1. Right-click SpeakEasy.app → Open
2. Click "Open" in the warning dialog

**Method 2 (Terminal):**
```bash
xattr -cr /Applications/SpeakEasy.app
```

### Signed App ($99/year Apple Developer Account)

1. Obtain Apple Developer certificate
2. Add signing identity to `tauri.conf.json`:
   ```json
   "signingIdentity": "Developer ID Application: Your Name (TEAMID)"
   ```
3. Notarize with Apple for smooth Gatekeeper experience

### Universal Binary

The `--target universal-apple-darwin` flag creates a fat binary that runs natively on both Intel and Apple Silicon Macs.

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: Build Blockers & Safety (MUST DO FIRST)            │
│ ├── 0.1 Fix clipboard-win dependency        [5 min]         │
│ ├── 0.2 Create CI workflow (SAFETY NET)     [15 min]        │
│ └── 0.3 Add Info.plist permissions          [10 min]        │
├─────────────────────────────────────────────────────────────┤
│ Phase 1: Core Functionality                                  │
│ ├── 1.1 Implement Cmd+V/C simulation        [30 min]        │
│ └── 1.2 Implement Chrome paths              [45 min]        │
├─────────────────────────────────────────────────────────────┤
│ Phase 2: Build & Distribution                                │
│ ├── 2.1 Enable release CI for macOS         [5 min]         │
│ └── 2.2 Verify icons                        [10 min]        │
├─────────────────────────────────────────────────────────────┤
│ Phase 3: Polish (Optional for MVP)                           │
│ ├── 3.1 Test/fix window z-order             [30 min?]       │
│ ├── 3.2 Platform-aware tooltip              [5 min]         │
│ └── 3.3 Document hotkey conventions         [15 min]        │
└─────────────────────────────────────────────────────────────┘

Estimated Total: ~2.75 hours (excluding testing)
```

**Critical:** Task 0.2 (CI workflow) is your ongoing protection. Once this is in place, you cannot accidentally merge code that breaks either platform.

---

## Files Modified Summary

| File | Changes | Phase |
|------|---------|-------|
| `src-tauri/Cargo.toml` | Move clipboard-win to conditional | 0 |
| `.github/workflows/ci.yml` | **NEW** - Cross-platform CI safety net | 0 |
| `src-tauri/tauri.conf.json` | Add macOS bundle config + permissions | 0 |
| `src-tauri/src/clipboard.rs` | Add Cmd+V/C functions (~80 lines) | 1 |
| `src-tauri/src/commands.rs` | Add macOS Chrome paths (~60 lines) | 1 |
| `.github/workflows/release.yml` | Uncomment macOS build + add target | 2 |
| `src-tauri/icons/icon.icns` | Generate if missing | 2 |
| `src-tauri/Cargo.toml` | Maybe add cocoa dep | 3 (if needed) |
| `src-tauri/src/window_topmost.rs` | Maybe add NSWindow code | 3 (if needed) |
| `src-tauri/src/lib.rs` | Platform-aware tooltip | 3 |

---

## What's Already Done (No Changes Needed)

These were previously listed as "needs implementation" in the old plan but are already complete:

- ✅ **Machine ID generation for macOS** (`license.rs:203-228`) - Uses `ioreg` command
- ✅ **Autostart via LaunchAgent** (`lib.rs:50-52`) - `MacosLauncher::LaunchAgent` configured
- ✅ **Cross-platform clipboard read/write** (`clipboard.rs:13-18`) - Uses `arboard` crate
- ✅ **OS detection in feedback** (`feedback.rs:31-39`) - Detects macOS
- ✅ **Keyring/credential storage** - Cross-platform by default (uses macOS Keychain)
- ✅ **Audio recording/playback** - `cpal`/`rodio` are cross-platform

---

## Approval Checklist

Before beginning implementation, please confirm:

- [ ] **Repository strategy approved:** Single repo with CI gate (Option 3)
- [ ] **Branch:** Will create `feature/macos-support` from main for development
- [ ] **CI protection:** Task 0.2 (cross-platform CI) is understood as the safety net
- [ ] Phase 0-2 implementation order is acceptable
- [ ] Phase 3 (Polish) can be deferred for MVP if needed
- [ ] Testing will eventually be done on real Mac hardware
- [ ] Unsigned distribution is acceptable for initial release

---

**Awaiting your approval to begin implementation.**
