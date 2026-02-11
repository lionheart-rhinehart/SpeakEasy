# /test-protocol - Build, Test, and Validate

Build the Tauri installer, install it, and launch the app for manual testing. Also runs quality gates (lint, typecheck, build, cargo check) before building.

## Usage

```
/test-protocol                 # Full workflow: gates + build + install + launch
/test-protocol --skip-backup   # Skip backup creation
/test-protocol --skip-gates    # Skip quality gates, go straight to build + install
/test-protocol --skip-rust     # Skip Rust checking (cargo check)
/test-protocol --no-restart    # Skip dev server auto-restart
```

## Why This Command Exists

Before committing, you need to verify:
- Code compiles/builds without errors (quality gates)
- The desktop app actually installs and runs correctly (build + install + launch)
- No regressions introduced

This lets you test the real app before running `/wrapup` to commit.

## Process

### Step 1: Run the Test Protocol Script

Execute the **project-level** test protocol script:

```bash
npm run test-protocol
```

Or with flags:
```bash
npm run test-protocol -- --skip-backup
npm run test-protocol -- --skip-gates
npm run test-protocol -- --no-restart
```

**The script will:**
1. Create a timestamped backup (in `.backups/`)
2. Run preflight checks (node, npm, rust, git)
3. Run quality gates: lint, typecheck, build, cargo check
4. Build the Tauri release installer (`npm run tauri build`)
5. Kill any running SpeakEasy instances
6. Run the NSIS installer silently
7. Launch the installed app from `%LOCALAPPDATA%\SpeakEasy`
8. Restart the dev server (if it was running)
9. Write results to `.test-protocol-result.json`

### Step 2: Read Results

After script completes, read `.test-protocol-result.json` for status of each step.

### Step 3: Manual Testing

The app is now running. Test your changes manually, then:
- If everything works: run `/wrapup` to commit
- If issues found: fix them and run `/test-protocol` again

### Step 4: Help Debug Failures

When the script fails, offer to help:

1. **Analyze failure messages** - Look for patterns in error output
2. **Check recent changes** - What was modified that could cause this?
3. **Suggest fixes** - Based on error messages
4. **Offer to re-run** - After fixes are applied

**Common failure patterns:**

| Error Pattern | Likely Cause | Suggested Fix |
|---------------|--------------|---------------|
| "undefined is not a function" | Missing import or typo | Check import statements |
| "Expected X, got Y" | Logic error or test needs update | Compare actual vs expected |
| "Timeout" | Async issue or slow operation | Add await, increase timeout |
| "Module not found" | Missing dependency | Run npm install |
| "Type error" | TypeScript mismatch | Fix type annotations |
| Tauri build fails | Rust compile error | Check `src-tauri/` code |
| Installer not found | Build didn't complete | Re-run without --skip-gates |

### Step 5: Record for Wrapup

The `.test-protocol-result.json` file is automatically read by `/wrapup` to:
- Include test results in commit message
- Add failures to lessons learned (if recurring)
- Block commit if critical failures exist

## Backup Strategy

Before running, the script creates a backup:
- Location: `.backups/backup-YYYY-MM-DD__HH-MM-SS`
- Keeps last 5 backups (older ones are pruned)
- Excludes: node_modules, .git, target, dist

Skip with `--skip-backup` for faster iteration.

## Tips

1. **Run before committing** - This is the whole point: test before you ship
2. **Use --skip-gates for iteration** - If gates already passed, just rebuild + install
3. **Use --skip-backup for speed** - When iterating on small fixes
4. **Review failures carefully** - Don't just re-run hoping it passes

## Related Commands

- `/wrapup` - Commit changes (reads test results)
- `/pre-flight-check` - Start work session
