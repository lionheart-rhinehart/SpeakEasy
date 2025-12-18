# Test Protocol - Standard Operating Procedure

## Purpose

The `/test-protocol` command automates the build, install, and launch process so you can manually test changes before committing to git. This ensures you never push untested code.

## When to Use

Run `/test-protocol` after you've made code changes and want to verify they work in the actual installed application - not just the dev server.

## What It Does

1. **Preflight Checks** - Verifies node, npm, rust, and git are available
2. **Quality Gates** - Runs lint, typecheck, build, and cargo check (fails fast if any issues)
3. **Release Build** - Creates the NSIS installer (`npm run tauri build`)
4. **Kill Running App** - Terminates any running SpeakEasy.exe instances
5. **Run Installer** - Silently installs the new build
6. **Launch App** - Starts the freshly installed application
7. **Restart Dev Server** - Restarts the dev server in the background (if it was running)

## How to Run

### Via Slash Command (Recommended)
```
/test-protocol
```

### Via npm
```bash
npm run test-protocol
```

### With Flags
```bash
npm run test-protocol -- --skip-gates    # Skip lint/typecheck/build
npm run test-protocol -- --skip-rust     # Skip cargo check
npm run test-protocol -- --no-restart    # Don't restart dev server
```

## Behavior

- **Fail-Fast**: If any step fails, the process stops immediately. Fix the issue and run again.
- **State File**: Results are saved to `.test-protocol-result.json` for wrapup to read later.
- **No Git Operations**: This command does NOT commit or push anything.

## After Running

1. The app should now be running
2. Test your changes manually
3. When satisfied, run `/wrapup` to commit and push

## Workflow Integration

```
Make changes → /test-protocol → Manual testing → /wrapup
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Lint fails | Fix ESLint errors, run again |
| Typecheck fails | Fix TypeScript errors, run again |
| Build fails | Check console output for Vite/Tauri errors |
| Installer not found | Ensure `npm run tauri build` completed successfully |
| App won't launch | Check install path: `%LOCALAPPDATA%\SpeakEasy\SpeakEasy.exe` |

## Related Files

- Script: `scripts/test-protocol.mjs`
- Slash Command: `.claude/commands/test-protocol.md`
- State Output: `.test-protocol-result.json` (gitignored)
