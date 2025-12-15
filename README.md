# SpeakEasy

## Git & GitHub Setup Instructions

### 1. Setting the Remote

Set the project to use your GitHub repository as origin:

```
git remote add origin https://github.com/lionheart-rhinehart/SpeakEasy.git
```
Or, if it already exists but is incorrect:
```
git remote set-url origin https://github.com/lionheart-rhinehart/SpeakEasy.git
```

### 2. Pushing Local Branches
Push your branches to GitHub:
```
git push -u origin master
```
(Repeat for other branches, e.g., `plan-edit`):
```
git push -u origin plan-edit
```

### 3. Troubleshooting
- **Remote repo does not exist:** Ensure it is created at GitHub and your remote URL is correct.
- **Authentication errors:** Make sure you are signed in with credentials for your GitHub account, and have permission for the repository.
- **Push errors about "no upstream configured":** Use `git push -u origin BRANCH_NAME` to set up tracking the first time you push a branch.
- **GitHub CLI errors:** Install [`gh`](https://cli.github.com/) and run `gh auth login` if not authenticated.

### 4. Automation Notes
- The wrapup script (`scripts/wrapup.mjs`) automatically pushes changes to your `origin` remote. If the remote repository does not exist or you are not authenticated, it will provide explicit error messages. See that script for details and logs.

---

# Overlay Recording Status Bar Architecture & Troubleshooting

## Overlay Window Lifecycle
- The global "Recording Overlay" (status bar for recording/processing) is implemented as a separate Tauri window (`recording-overlay`).
- The overlay is always created at app startup, even if it is invisible or not currently shown.
- Aggressive window re-creation logic ensures that any lost/closed overlay window (by crash, OS, or dev reload) is automatically restored on next show attempt.
- All overlay logic, including show/hide/state/set position, logs key lifecycle and error events.

## Edge Cases / QA Checklist
- Multi-monitor and DPI: Overlay always positioned bottom-right of the primary monitor; logs geometry every show.
- Minimize/tray: Overlay hides if app is minimized, restores as needed.
- Window loss/restart: Overlay will be auto-recreated as needed.
- All events and errors (creation, emission, geometry) are clearly logged for QA/developer review.
- See inline code comments in `src-tauri/src/lib.rs`, `src-tauri/src/commands.rs`, `src/components/RecordingOverlay.tsx` for technical detail.

## Troubleshooting
- If the overlay is ever not shown: Check logs for overlay creation, show, geometry, and state change details.
- Development hot reload and release/installer: Aggressive creation logic applies everywhere. Overlay cannot "vanish" unless self-terminated by OS or system resource exhaustion (in which case, recovery is automatic on next use).

For further setup or troubleshooting, see the repository [issues](https://github.com/lionheart-rhinehart/SpeakEasy/issues) or consult a team administrator.
