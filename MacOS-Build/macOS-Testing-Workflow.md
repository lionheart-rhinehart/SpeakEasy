# macOS Testing Workflow

## Overview

```
Windows (coding) → Push to GitHub → GitHub Actions builds DMG → Download on Mac → Test
```

---

## Mac Setup Status: COMPLETE

| Component | Status |
|-----------|--------|
| Git 2.52.0 | Installed |
| GitHub CLI 2.83.2 | Authenticated as lionheart-rhinehart |
| SSH Key | Configured |

No dev tools needed on Mac - CI builds the app.

---

## How to Test on Mac

### 1. Download the DMG after pushing from Windows

**Via Terminal:**
```bash
# List recent workflow runs
gh run list --repo lionheart-rhinehart/SpeakEasy

# Download artifact from latest run
gh run download --repo lionheart-rhinehart/SpeakEasy --name macos-dmg
```

**Or via Browser:**
1. Go to https://github.com/lionheart-rhinehart/SpeakEasy/actions
2. Click the latest workflow run
3. Scroll to Artifacts → Download `macos-dmg`

### 2. Install the app
1. Double-click the `.dmg` file
2. Drag SpeakEasy to Applications folder
3. First launch: Right-click → Open (bypasses unsigned app warning)

### 3. Grant permissions when prompted
- **Accessibility**: System Preferences → Security & Privacy → Privacy → Accessibility → Add SpeakEasy
- **Microphone**: Will prompt on first recording

---

## Test Checklist

- [ ] App launches without errors
- [ ] Audio recording works
- [ ] Hotkeys register correctly
- [ ] Cmd+V paste simulation works
- [ ] Chrome profile detection works
- [ ] Recording overlay stays on top
- [ ] System tray works

---

## What You Need to Do on Windows

Reference: `MacOS-Build/macOS-Port-Plan.md` for implementation details

1. **Create GitHub Actions workflow** (`.github/workflows/build-macos.yml`)
2. **Implement macOS code changes**:
   - `src-tauri/src/commands.rs` - Chrome paths
   - `src-tauri/src/clipboard.rs` - Cmd+V/C instead of Ctrl
   - `src-tauri/src/window_topmost.rs` - if needed
   - `src-tauri/tauri.conf.json` - macOS bundle config
3. Push to mac branch → CI builds → Download DMG on Mac → Test

---

## Notes

- App will be unsigned (no Apple Developer account)
- Users need to right-click → Open on first launch
- Accessibility permission required for paste simulation
