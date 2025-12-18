# macOS Port Plan for SpeakEasy

## Summary

Make SpeakEasy cross-platform by adding macOS support. The frontend is already platform-agnostic. The Rust backend needs macOS implementations for 4 Windows-specific features.

## Current Status

| Component | Status |
|-----------|--------|
| Frontend (React/TS) | ✅ Ready |
| Audio, Credentials, Config, Hotkeys, Tray, Autostart | ✅ Ready |
| Window Z-Order Enforcement | ⚠️ No-op stub exists |
| Input Simulation (paste/copy) | ⚠️ Falls back to rdev (uses Ctrl, not Cmd) |
| Chrome Profile Discovery | ❌ Returns error on non-Windows |
| Open URL in Chrome | ⚠️ Falls back to default browser |
| Build/Distribution | ❌ Windows-only NSIS |

---

## Implementation Tasks

### Task 1: macOS Chrome Support (`src-tauri/src/commands.rs`)

Add `#[cfg(target_os = "macos")]` blocks for Chrome paths.

#### 1.1 Add macOS variant of `get_chrome_user_data_dir()`

Current Windows-only function at line 1165. Add macOS version:

```rust
#[cfg(target_os = "macos")]
fn get_chrome_user_data_dir() -> Option<String> {
    dirs::home_dir()
        .map(|h| h.join("Library/Application Support/Google/Chrome"))
        .map(|p| p.to_string_lossy().to_string())
        .filter(|path| std::path::Path::new(path).exists())
}

#[cfg(target_os = "windows")]
fn get_chrome_user_data_dir() -> Option<String> {
    std::env::var("LOCALAPPDATA")
        .map(|local| format!(r"{}\Google\Chrome\User Data", local))
        .ok()
        .filter(|path| std::path::Path::new(path).exists())
}
```

#### 1.2 Update `list_chrome_profiles()` (line 1175)

Change the `#[cfg(target_os = "windows")]` block to `#[cfg(any(target_os = "windows", target_os = "macos"))]` so the same profile scanning logic works on both platforms.

#### 1.3 Update `open_url_in_chrome()` (line 1274)

Add macOS Chrome path detection:

```rust
#[cfg(target_os = "macos")]
{
    let chrome_paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ];

    // Also check user's home Applications folder
    let user_chrome = dirs::home_dir()
        .map(|h| h.join("Applications/Google Chrome.app/Contents/MacOS/Google Chrome"))
        .map(|p| p.to_string_lossy().to_string());

    // ... rest of logic same as Windows
}
```

---

### Task 2: macOS Input Simulation (`src-tauri/src/clipboard.rs`)

The existing `rdev` fallback uses Ctrl+V/C which doesn't work on macOS (needs Cmd+V/C).

#### 2.1 Add macOS-specific paste function

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

#### 2.2 Add macOS-specific copy function

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

#### 2.3 Update `simulate_paste()` and `simulate_copy()` to call macOS versions

In `simulate_paste()`:
```rust
// On macOS, use Cmd+V
#[cfg(target_os = "macos")]
{
    return simulate_paste_macos();
}
```

In `simulate_copy()`:
```rust
// On macOS, use Cmd+C
#[cfg(target_os = "macos")]
{
    return simulate_copy_macos();
}
```

#### Important: Accessibility Permissions

macOS requires the app to have Accessibility permissions for input simulation. Users will need to:
1. Go to System Preferences → Security & Privacy → Privacy → Accessibility
2. Add SpeakEasy to the allowed apps list
3. The app should prompt for this on first use (Tauri may handle this automatically)

---

### Task 3: Window Z-Order (`src-tauri/src/window_topmost.rs`)

Current macOS stub is a no-op. Two options:

#### Option A: Test Tauri's built-in first (Recommended)

Tauri's `alwaysOnTop` flag in `tauri.conf.json` might work reliably on macOS. Test this first before adding custom code.

The recording overlay window already has `"alwaysOnTop": true` configured. If this works on macOS, no changes needed.

#### Option B: If Tauri's flag doesn't work, add NSWindow level control

Add to `Cargo.toml`:
```toml
[target.'cfg(target_os = "macos")'.dependencies]
cocoa = "0.25"
objc = "0.2"
```

Then in `window_topmost.rs`:
```rust
#[cfg(target_os = "macos")]
pub fn apply_topmost_subclass(window: &tauri::WebviewWindow) -> Result<()> {
    use cocoa::appkit::{NSWindow, NSWindowCollectionBehavior};
    use cocoa::base::id;
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
        // Set window level to floating (above normal windows)
        let _: () = msg_send![ns_window, setLevel: 3i64]; // NSFloatingWindowLevel = 3

        // Make window visible on all spaces
        let behavior = NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces;
        let _: () = msg_send![ns_window, setCollectionBehavior: behavior];
    }

    log::info!("[window_topmost] Applied floating window level on macOS");
    Ok(())
}
```

---

### Task 4: Build Configuration

#### 4.1 Update `src-tauri/tauri.conf.json`

Add macOS bundle configuration:

```json
{
  "bundle": {
    "macOS": {
      "entitlements": null,
      "exceptionDomain": "",
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "signingIdentity": null,
      "providerShortName": null,
      "dmg": {
        "appPosition": { "x": 180, "y": 170 },
        "applicationFolderPosition": { "x": 480, "y": 170 },
        "windowSize": { "width": 660, "height": 400 }
      }
    }
  }
}
```

#### 4.2 Generate macOS icon

Tauri can auto-generate `icon.icns` from existing PNG files. Ensure you have:
- `src-tauri/icons/icon.png` (at least 1024x1024)

Or manually create `src-tauri/icons/icon.icns` using:
```bash
# On macOS:
iconutil -c icns icon.iconset

# Or use online converter from PNG
```

#### 4.3 Add GitHub Actions workflow for macOS builds

Create `.github/workflows/build-macos.yml`:

```yaml
name: Build macOS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-macos:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Rust
        uses: dtolnay/rust-action@stable

      - name: Install dependencies
        run: npm ci

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: v__VERSION__
          releaseName: 'SpeakEasy v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false

      - name: Upload DMG artifact
        uses: actions/upload-artifact@v4
        with:
          name: macos-dmg
          path: src-tauri/target/release/bundle/dmg/*.dmg
```

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `src-tauri/src/commands.rs` | Add macOS Chrome paths (~40 lines) |
| `src-tauri/src/clipboard.rs` | Add Cmd+V/C for macOS (~40 lines) |
| `src-tauri/src/window_topmost.rs` | Add NSWindow level (optional, ~30 lines) |
| `src-tauri/Cargo.toml` | Add `cocoa` dep (if Task 3 Option B needed) |
| `src-tauri/tauri.conf.json` | Add macOS bundle config |
| `.github/workflows/build-macos.yml` | New file for CI builds |

---

## Testing Considerations

### Without a Mac

1. **CI builds** - GitHub Actions macOS runners can build and compile the app
2. **Compilation verification** - Ensures Rust code compiles for macOS target
3. **Cannot test runtime** - Input simulation, window behavior need real Mac

### With a Mac (future)

1. Test audio recording and playback
2. Test hotkey registration (global shortcuts)
3. Test input simulation (Cmd+V/C) - check Accessibility permissions prompt
4. Test recording overlay stays on top
5. Test Chrome profile detection
6. Test system tray functionality
7. Test autostart via LaunchAgent

---

## Distribution Notes (Unsigned App)

Without an Apple Developer account ($99/year), the app will be unsigned. macOS users must:

1. **First launch**: Right-click the app → Open → Open (to bypass Gatekeeper)
2. **Or via Terminal**: `xattr -cr /Applications/SpeakEasy.app`

If you later get a Developer account, you can:
1. Sign the app with your certificate
2. Notarize with Apple for smooth Gatekeeper experience
3. Optionally distribute via Mac App Store

---

## Execution Checklist

When ready to implement:

- [ ] Create feature branch: `git checkout -b feature/macos-support`
- [ ] Task 1: Update Chrome paths in `commands.rs`
- [ ] Task 2: Add Cmd+V/C input simulation in `clipboard.rs`
- [ ] Task 3: Test Tauri's `alwaysOnTop` first; add NSWindow code if needed
- [ ] Task 4.1: Add macOS config to `tauri.conf.json`
- [ ] Task 4.3: Add GitHub Actions workflow
- [ ] Push and verify CI builds succeed
- [ ] Find a Mac user to test the DMG artifact
- [ ] Fix any runtime issues discovered
- [ ] Merge to main when working
