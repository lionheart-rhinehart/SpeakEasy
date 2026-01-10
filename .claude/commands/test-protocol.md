# /test-protocol - Build, Test, and Validate

Run quality gates before committing. This command builds, tests, and validates the project to ensure code quality.

## Usage

```
/test-protocol              # Run all quality gates
/test-protocol --skip-backup   # Skip backup creation
/test-protocol --quick         # Only run lint + typecheck (skip full build/tests)
```

## Why This Command Exists

Before committing, you need to verify:
- Code compiles/builds without errors
- Tests pass
- Linting passes
- No regressions introduced

This command automates all of that and captures the results for `/wrapup` to use.

## Process

### Step 1: Run the Test Protocol Script

Execute the test protocol script:

```bash
node ~/.claude/scripts/test-protocol.mjs
```

Or with flags:
```bash
node ~/.claude/scripts/test-protocol.mjs --skip-backup
node ~/.claude/scripts/test-protocol.mjs --quick
```

**The script will:**
1. Detect project type (node, react, nextjs, tauri, rust, python)
2. Create backup of current state (unless --skip-backup)
3. Run quality gates: lint, typecheck, build, tests
4. Write results to `.test-protocol-result.json`
5. Display pass/fail status

### Step 2: Read Results

After script completes, read `.test-protocol-result.json`:

```json
{
  "overall_status": "PASS" | "FAIL",
  "project_type": "node" | "react" | "nextjs" | "tauri" | "rust" | "python",
  "duration_seconds": 45,
  "steps": {
    "lint": { "status": "PASS", "output": "..." },
    "typecheck": { "status": "SKIP", "reason": "not configured" },
    "build": { "status": "PASS", "output": "..." },
    "test": { "status": "FAIL", "output": "...", "failures": [...] }
  },
  "timestamp": "2025-12-24T14:30:00Z"
}
```

### Step 3: Interpret Results

**If PASS:**
```
═══════════════════════════════════════════════════════════════
                    ✓ TEST PROTOCOL: PASS
═══════════════════════════════════════════════════════════════

All quality gates passed!

  Lint:      ✅ PASS
  Typecheck: ✅ PASS
  Build:     ✅ PASS
  Tests:     ✅ PASS (12/12)

Duration: 45s
Ready for: /wrapup

═══════════════════════════════════════════════════════════════
```

**If FAIL:**
```
═══════════════════════════════════════════════════════════════
                    ⚠️ TEST PROTOCOL: FAIL
═══════════════════════════════════════════════════════════════

Quality gate failures detected!

  Lint:      ✅ PASS
  Typecheck: ✅ PASS
  Build:     ✅ PASS
  Tests:     ❌ FAIL (9/12)

Failed tests:
  1. test_user_auth - Expected 200, got 401
  2. test_profile_update - Timeout after 5000ms
  3. test_cart_add - undefined is not a function

Duration: 52s
Action: Fix failures before running /wrapup

═══════════════════════════════════════════════════════════════
```

### Step 4: Help Debug Failures

When tests fail, offer to help:

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

### Step 5: Record for Wrapup

The `.test-protocol-result.json` file is automatically read by `/wrapup` to:
- Include test results in commit message
- Add failures to lessons learned (if recurring)
- Block commit if critical failures exist

## Project Type Detection

The script auto-detects project type:

| Project Type | Detection | Build Command | Test Command |
|--------------|-----------|---------------|--------------|
| node | package.json exists | npm run build | npm test |
| react | react in dependencies | npm run build | npm test |
| nextjs | next in dependencies | npm run build | npm test |
| tauri | @tauri-apps/api or src-tauri/ | npm run build | npm test |
| rust | Cargo.toml exists | cargo build | cargo test |
| python | setup.py or pyproject.toml | pip install -e . | pytest |

## Backup Strategy

Before running tests, the script creates a backup:
- Location: `backups/pre-test-[timestamp].tar.gz` (or .zip on Windows)
- Includes: All source files, configs (excludes node_modules, .git, dist)
- Purpose: Easy rollback if something goes wrong

Skip with `--skip-backup` for faster iteration.

## Output

**Success:**
```
TEST PROTOCOL: PASS

All gates passed. Ready for /wrapup.
Result saved to: .test-protocol-result.json
```

**Failure:**
```
TEST PROTOCOL: FAIL

3 test failures detected.
Would you like me to help debug these?
```

## Error Handling

**If script not found:**
- Check if scripts are installed: `ls ~/.claude/scripts/`
- Run installer: `install.ps1` or `install.sh`
- Verify PATH includes scripts directory

**If no package.json/Cargo.toml:**
- Script will report "unknown project type"
- Suggest creating package.json or specifying commands

**If commands fail to run:**
- Check that dependencies are installed (npm install)
- Check that build scripts exist in package.json
- Fall back to manual commands

## Tips

1. **Run before committing** - Catch issues early
2. **Run after major changes** - Verify nothing broke
3. **Use --quick for iteration** - Fast feedback during development
4. **Review failures carefully** - Don't just re-run hoping it passes

## Related Commands

- `/wrapup` - Commit changes (reads test results)
- `/pre-flight-check` - Start work session
