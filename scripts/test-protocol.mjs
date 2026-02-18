#!/usr/bin/env node
/**
 * test-protocol.mjs - Build, install, and launch app for manual testing
 *
 * Usage: npm run test-protocol -- [options]
 *
 * Control flags:
 *   --skip-backup    Skip creating backup before running
 *   --skip-gates     Skip quality gates (lint/typecheck/build)
 *   --skip-rust      Skip Rust checking (cargo check)
 *   --no-restart     Skip dev server auto-restart
 *
 * This script:
 * - Creates a timestamped backup before each run (in .backups/)
 * - Writes a state file (.test-protocol-result.json) that wrapup.mjs can read
 * - Appends to history log (.test-protocol-history.json) for tracking across sessions
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, mkdirSync, rmSync, copyFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const STATE_FILE = join(ROOT, '.test-protocol-result.json');
const BACKUP_DIR = join(ROOT, '.backups');
const HISTORY_FILE = join(ROOT, '.test-protocol-history.json');
const MAX_BACKUPS = 5;
const MAX_HISTORY_ENTRIES = 50;

// Directories to exclude from backups (these are large/generated)
const BACKUP_EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'target',
  'dist',
  '.backups',
  '.next'
];

// ─────────────────────────────────────────────────────────────────────────────
// Argument Parsing
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    flags: [],
    options: {}
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args.options[key] = argv[i + 1];
        i++;
      } else {
        args.flags.push(key);
      }
    }
  }

  return args;
}

const parsedArgs = parseArgs(process.argv.slice(2));

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(msg, color = '') {
  console.log(`${color}${msg}${colors.reset}`);
}

function logStep(step, msg) {
  log(`\n[${'STEP ' + step}] ${msg}`, colors.cyan + colors.bold);
}

function logSuccess(msg) {
  log(`  ✓ ${msg}`, colors.green);
}

function logError(msg) {
  log(`  ✗ ${msg}`, colors.red);
}

function logWarn(msg) {
  log(`  ⚠ ${msg}`, colors.yellow);
}

function logInfo(msg) {
  log(`  → ${msg}`, colors.dim);
}

function run(cmd, options = {}) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (e) {
    if (options.ignoreError) return e.stdout || '';
    throw e;
  }
}

function commandExists(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// State Management
// ─────────────────────────────────────────────────────────────────────────────
const startTime = Date.now();

let state = {
  version: '1.0',
  timestamp: new Date().toISOString(),
  overall_status: 'pending',
  duration_seconds: 0,
  steps: [],
  build_info: {},
  notes: ''
};

function saveState() {
  state.duration_seconds = Math.round((Date.now() - startTime) / 1000);
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function recordStep(name, displayName, fn) {
  const stepStart = Date.now();
  const step = {
    name,
    status: 'pending',
    duration_ms: 0,
    details: '',
    warnings: [],
    errors: []
  };

  logStep(state.steps.length + 1, displayName);

  try {
    const result = fn(step);
    step.status = 'passed';
    step.details = result?.details || '';
    if (result?.warnings) {
      step.warnings = result.warnings;
      for (const w of result.warnings) {
        logWarn(w);
      }
    }
    logSuccess(`${displayName} complete`);
  } catch (e) {
    step.status = 'failed';
    step.errors.push(e.message);
    step.details = e.message;
    state.overall_status = 'failure';
    logError(e.message);
    step.duration_ms = Date.now() - stepStart;
    state.steps.push(step);
    saveState();
    throw e; // Fail-fast
  }

  step.duration_ms = Date.now() - stepStart;
  state.steps.push(step);
  saveState();
}

// ─────────────────────────────────────────────────────────────────────────────
// Backup System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively copy directory, excluding specified directories
 */
function copyDirRecursive(src, dest, excludeDirs) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    // Skip excluded directories
    if (entry.isDirectory() && excludeDirs.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, excludeDirs);
    } else {
      try {
        copyFileSync(srcPath, destPath);
      } catch (e) {
        // Skip files we can't copy (permissions, etc.)
      }
    }
  }
}

/**
 * Create a timestamped backup of the working directory
 */
function createBackup(step) {
  if (parsedArgs.flags.includes('skip-backup')) {
    logInfo('Skipped via --skip-backup flag');
    return { details: 'Skipped via --skip-backup flag' };
  }

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Create timestamped backup folder
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = join(BACKUP_DIR, `backup-${timestamp}`);

  logInfo(`Creating backup at .backups/backup-${timestamp}`);

  try {
    copyDirRecursive(ROOT, backupPath, BACKUP_EXCLUDE_DIRS);
    logSuccess('Backup created');

    // Rotate old backups - keep only MAX_BACKUPS
    const backups = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-'))
      .sort()
      .reverse();

    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const old of toDelete) {
        try {
          rmSync(join(BACKUP_DIR, old), { recursive: true, force: true });
          logInfo(`Rotated out old backup: ${old}`);
        } catch (e) {
          logWarn(`Failed to delete old backup ${old}: ${e.message}`);
        }
      }
    }

    return { details: `Backup created at ${backupPath}` };
  } catch (e) {
    // Backup failure is a warning, not a fatal error
    return {
      details: 'Backup failed (continuing anyway)',
      warnings: [`Backup failed: ${e.message}`]
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// History Log
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append the current run to the history log
 */
function appendToHistory() {
  try {
    let history = [];
    if (existsSync(HISTORY_FILE)) {
      history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    }

    history.push({
      timestamp: state.timestamp,
      status: state.overall_status,
      duration_seconds: state.duration_seconds,
      build_info: state.build_info,
      step_summary: state.steps.map(s => `${s.name}:${s.status}`)
    });

    // Keep only last MAX_HISTORY_ENTRIES entries
    if (history.length > MAX_HISTORY_ENTRIES) {
      history = history.slice(-MAX_HISTORY_ENTRIES);
    }

    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    logInfo(`Appended to history log (${history.length} entries)`);
  } catch (e) {
    logWarn(`Failed to update history log: ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step: Preflight Checks
// ─────────────────────────────────────────────────────────────────────────────
function preflight(step) {
  const details = [];
  const warnings = [];

  // Check Node
  const nodeVersion = process.version;
  logInfo(`Node: ${nodeVersion}`);
  details.push(`Node ${nodeVersion}`);

  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    logInfo(`npm: ${npmVersion}`);
    details.push(`npm ${npmVersion}`);
  } catch {
    warnings.push('npm not found');
    logWarn('npm not found');
  }

  // Check Rust (required for Tauri)
  try {
    const rustVersion = execSync('rustc --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    logInfo(`Rust: ${rustVersion}`);
    details.push(rustVersion);
  } catch {
    throw new Error('Rust not installed - required for Tauri builds');
  }

  // Check git
  if (commandExists('git')) {
    const gitVersion = execSync('git --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    logInfo(`Git: ${gitVersion}`);
    details.push(gitVersion);
  } else {
    warnings.push('git not found');
    logWarn('git not found');
  }

  return { details: details.join(', '), warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step: Quality Gates
// ─────────────────────────────────────────────────────────────────────────────
function runQualityGates(step) {
  if (parsedArgs.flags.includes('skip-gates')) {
    logInfo('Skipped via --skip-gates flag');
    step.status = 'skipped';
    return { details: 'Skipped via --skip-gates flag' };
  }

  const warnings = [];

  // Lint
  logInfo('Running lint...');
  try {
    run('npm run lint');
    logSuccess('Lint passed');
  } catch (e) {
    throw new Error('Lint failed - fix errors before testing');
  }

  // Typecheck
  logInfo('Running typecheck...');
  try {
    run('npm run typecheck');
    logSuccess('Typecheck passed');
  } catch (e) {
    throw new Error('Typecheck failed - fix type errors before testing');
  }

  // Build
  logInfo('Running build...');
  try {
    run('npm run build');
    logSuccess('Build passed');
  } catch (e) {
    throw new Error('Build failed - fix build errors before testing');
  }

  // Rust check (conditional)
  const cargoTomlPath = existsSync(join(ROOT, 'Cargo.toml'))
    ? ROOT
    : existsSync(join(ROOT, 'src-tauri', 'Cargo.toml'))
      ? join(ROOT, 'src-tauri')
      : null;

  if (cargoTomlPath && !parsedArgs.flags.includes('skip-rust')) {
    logInfo('Running Rust check (strict: warnings = errors)...');
    try {
      const originalRustflags = process.env.RUSTFLAGS || '';
      process.env.RUSTFLAGS = originalRustflags + ' -D warnings';

      run('cargo check --all-targets', { cwd: cargoTomlPath });

      if (originalRustflags) {
        process.env.RUSTFLAGS = originalRustflags;
      } else {
        delete process.env.RUSTFLAGS;
      }

      logSuccess('Rust check passed');
    } catch (e) {
      throw new Error('Rust check failed - fix Rust warnings/errors before testing');
    }
  }

  return { details: 'Lint, typecheck, build, cargo check all passed', warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step: Release Build
// ─────────────────────────────────────────────────────────────────────────────
function buildRelease(step) {
  logInfo('Building Tauri release (installer)... this may take a minute');

  try {
    run('npm run tauri build');
    logSuccess('Tauri release build complete');

    // Find the installer
    const nsisDir = join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
    if (existsSync(nsisDir)) {
      const installers = readdirSync(nsisDir).filter(f => f.endsWith('-setup.exe'));
      if (installers.length > 0) {
        const installerPath = join(nsisDir, installers[0]);
        const installerSize = (statSync(installerPath).size / (1024 * 1024)).toFixed(2);

        // Get version from tauri.conf.json
        let version = '1.0.0';
        let appName = 'SpeakEasy';
        try {
          const tauriConf = JSON.parse(readFileSync(join(ROOT, 'src-tauri', 'tauri.conf.json'), 'utf-8'));
          version = tauriConf.version || version;
          appName = tauriConf.productName || appName;
        } catch {}

        state.build_info = {
          app_name: appName,
          version: version,
          installer_path: installerPath.replace(ROOT, '').replace(/\\/g, '/'),
          installer_size_mb: parseFloat(installerSize)
        };

        logInfo(`Installer: ${installers[0]} (${installerSize} MB)`);
        return { details: `Built ${installers[0]}` };
      }
    }

    return { details: 'Build complete but installer not found' };
  } catch (e) {
    throw new Error('Tauri release build failed');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step: Kill Running App
// ─────────────────────────────────────────────────────────────────────────────
function killRunningApp(step) {
  const appName = 'SpeakEasy.exe';
  const details = [];

  // Kill installed/release SpeakEasy
  try {
    execSync(`taskkill /F /IM ${appName}`, { encoding: 'utf-8', stdio: 'pipe' });
    logInfo(`Killed running ${appName} processes`);
    details.push(`Killed ${appName}`);
  } catch (e) {
    logInfo(`No running ${appName} instance found`);
    details.push(`No ${appName} running`);
  }

  // Kill any Tauri dev server processes to prevent hotkey conflicts
  // (dev server registers same global shortcuts as the installed app)
  try {
    const wmic = execSync(
      'wmic process where "name=\'node.exe\' and CommandLine like \'%tauri%dev%\'" get ProcessId /FORMAT:LIST',
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    const pids = [...wmic.matchAll(/ProcessId=(\d+)/g)].map(m => m[1]);
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
      } catch { /* already exited */ }
    }
    if (pids.length > 0) {
      logInfo(`Killed ${pids.length} Tauri dev server process(es)`);
      details.push(`Killed ${pids.length} dev server process(es)`);
    }
  } catch {
    // No dev server running or WMIC not available — fine
  }

  return { details: details.join('; ') || 'No running instances found' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step: Run Installer
// ─────────────────────────────────────────────────────────────────────────────
function runInstaller(step) {
  const nsisDir = join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'nsis');

  if (!existsSync(nsisDir)) {
    throw new Error('NSIS directory not found - build may have failed');
  }

  const installers = readdirSync(nsisDir).filter(f => f.endsWith('-setup.exe'));
  if (installers.length === 0) {
    throw new Error('No installer found in NSIS directory');
  }

  const installerPath = join(nsisDir, installers[0]);
  logInfo(`Running installer: ${installers[0]}`);

  try {
    // Run installer silently with /S flag
    execSync(`"${installerPath}" /S`, {
      cwd: ROOT,
      stdio: 'inherit',
      timeout: 120000 // 2 minute timeout
    });
    logSuccess('Installer completed');
    return { details: `Ran ${installers[0]} silently` };
  } catch (e) {
    throw new Error(`Installer failed: ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step: Launch Installed App
// ─────────────────────────────────────────────────────────────────────────────
function launchInstalledApp(step) {
  // NSIS default install location
  const installPath = join(process.env.LOCALAPPDATA, 'SpeakEasy', 'SpeakEasy.exe');

  if (!existsSync(installPath)) {
    throw new Error(`Installed app not found at ${installPath}`);
  }

  logInfo(`Launching: ${installPath}`);

  try {
    // Launch detached so it runs independently
    const child = spawn(installPath, [], {
      detached: true,
      stdio: 'ignore',
      cwd: dirname(installPath)
    });
    child.unref();

    logSuccess('App launched');
    return { details: `Launched ${installPath}` };
  } catch (e) {
    throw new Error(`Failed to launch app: ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step: Smoke Test Checklist
// ─────────────────────────────────────────────────────────────────────────────
function smokeTestChecklist(step) {
  log('');
  log('┌─────────────────────────────────────────────────┐', colors.yellow);
  log('│  SMOKE TEST - Verify before /wrapup             │', colors.yellow + colors.bold);
  log('├─────────────────────────────────────────────────┤', colors.yellow);
  log('│  [ ] App launched without license/offline banner │', colors.yellow);
  log('│  [ ] Ctrl+Space records and transcribes          │', colors.yellow);
  log('│  [ ] AI Transform hotkey responds (sound plays)  │', colors.yellow);
  log('│  [ ] Settings panel opens and closes             │', colors.yellow);
  log('│  [ ] No error toasts on startup                  │', colors.yellow);
  log('└─────────────────────────────────────────────────┘', colors.yellow);
  log('');
  return { details: 'Smoke test checklist displayed' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step: Restart Dev Server
// ─────────────────────────────────────────────────────────────────────────────
let devServerWasRunning = false;

function detectRunningDevServer() {
  try {
    if (process.platform === 'win32') {
      // Use WMIC to check command lines — plain tasklist matches ANY node.exe
      // (including Claude Code, this script, etc.) causing false positives
      const wmic = execSync(
        'wmic process where "name=\'node.exe\'" get CommandLine /FORMAT:LIST',
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      devServerWasRunning = wmic.includes('tauri') && wmic.includes('dev');
    }
  } catch {
    // Ignore errors
  }
}

function restartDevServer(step) {
  if (parsedArgs.flags.includes('no-restart')) {
    logInfo('Skipped via --no-restart flag');
    return { details: 'Skipped via --no-restart flag' };
  }

  if (!devServerWasRunning) {
    logInfo('No dev server was running - skipping restart');
    return { details: 'No dev server was running' };
  }

  logInfo('Restarting dev server...');

  try {
    const isWindows = process.platform === 'win32';
    const child = isWindows
      ? spawn('cmd', ['/c', 'npm', 'run', 'tauri:dev'], {
          cwd: ROOT,
          detached: true,
          stdio: 'ignore'
        })
      : spawn('npm', ['run', 'tauri:dev'], {
          cwd: ROOT,
          detached: true,
          stdio: 'ignore'
        });

    child.unref();

    logSuccess('Dev server restarted in background');
    return { details: 'Dev server restarted (npm run tauri:dev)' };
  } catch (e) {
    return {
      details: 'Failed to restart dev server',
      warnings: [`Failed to restart dev server: ${e.message}`]
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  // Detect dev server before we start
  detectRunningDevServer();

  // Clear any previous state file
  if (existsSync(STATE_FILE)) {
    unlinkSync(STATE_FILE);
  }

  log('\n' + '═'.repeat(60), colors.cyan);
  log('  TEST PROTOCOL: Build & Test Workflow', colors.cyan + colors.bold);
  log('═'.repeat(60), colors.cyan);

  try {
    // Step 0: Create backup (safety net)
    recordStep('backup', 'Create backup', createBackup);

    // Step 1: Preflight
    recordStep('preflight', 'Preflight checks', preflight);

    // Step 2: Quality gates
    recordStep('quality_gates', 'Quality gates', runQualityGates);

    // Step 3: Release build
    recordStep('release_build', 'Release build', buildRelease);

    // Step 4: Kill running app
    recordStep('kill_app', 'Kill running app', killRunningApp);

    // Step 5: Run installer
    recordStep('run_installer', 'Run installer', runInstaller);

    // Step 6: Launch app
    recordStep('launch_app', 'Launch installed app', launchInstalledApp);

    // Step 7: Smoke test checklist
    recordStep('smoke_test', 'Manual smoke test checklist', smokeTestChecklist);

    // Step 8: Restart dev server
    recordStep('restart_dev', 'Restart dev server', restartDevServer);

    // Success!
    state.overall_status = 'success';
    state.notes = 'App is now running. Test manually, then run /wrapup when ready to commit.';
    saveState();

    // Append to history log for tracking across sessions
    appendToHistory();

    log('\n' + '═'.repeat(60), colors.green);
    log('  TEST PROTOCOL COMPLETE', colors.green + colors.bold);
    log('═'.repeat(60), colors.green);
    log('\n  The app is now running. Test it manually.', colors.dim);
    log('  When ready to commit, run: /wrapup\n', colors.dim);

  } catch (e) {
    // Append to history log even on failure
    appendToHistory();

    log('\n' + '═'.repeat(60), colors.red);
    log('  TEST PROTOCOL FAILED', colors.red + colors.bold);
    log('═'.repeat(60), colors.red);
    log(`\n  Error: ${e.message}`, colors.red);
    log('  Fix the issue and run test-protocol again.\n', colors.dim);
    process.exit(1);
  }
}

main();
