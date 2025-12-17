#!/usr/bin/env node
/**
 * wrapup.mjs - One-command end-of-task workflow (fully automated)
 * 
 * Usage: npm run wrapup -- [options]
 * 
 * Lesson fields (all optional - if provided, skips prompts):
 *   --area "devops"           Area/category of the work
 *   --title "add-feature"     Short title for the lesson
 *   --summary "What was done" Context/summary of the work
 *   --problem "What broke"    Problem/symptom encountered (optional)
 *   --fix "How it was fixed"  The solution (optional)
 *   --tags "tag1,tag2"        Comma-separated tags (optional)
 * 
 * Control flags:
 *   --skip-release   Skip full Tauri build (installer) - by default, always builds
 *   --skip-gates     Skip quality gates (lint/typecheck/build)
 *   --skip-rust      Skip Rust checking (cargo check)
 *   --skip-secrets   Skip secret scanning (use if another agent handles secrets)
 *   --no-git         Skip git operations
 *   --no-restart     Skip dev server auto-restart
 *   --github         Create public GitHub repo (automated, no prompt)
 *   --github-private Create private GitHub repo (automated, no prompt)
 * 
 * Example (fully automated, no prompts):
 *   npm run wrapup -- --skip-secrets --github-private --area "devops" --title "add-wrapup-sop" --summary "Added automated end-of-task workflow"
 */

import { execSync, spawnSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

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
      // Check if next arg is a value (not another flag)
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args.options[key] = argv[i + 1];
        i++; // Skip the value
      } else {
        args.flags.push(key);
      }
    }
  }
  
  return args;
}

const parsedArgs = parseArgs(process.argv.slice(2));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG_FILE = join(ROOT, '.wrapup.json');
const LESSONS_DIR = join(ROOT, 'lessons-learned');
const LESSONS_INDEX = join(LESSONS_DIR, 'README.md');
const LESSONS_JSON_INDEX = join(LESSONS_DIR, 'index.json');
const LESSONS_TEMPLATE = join(LESSONS_DIR, '_template.md');

// Secret patterns to scan for (safety net)
// These are tuned to minimize false positives while catching real secrets
const SECRET_PATTERNS = [
  // OpenAI - must be at least 48 chars (real keys are ~51 chars)
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9_-]{48,}/ },
  { name: 'OpenAI Project Key', pattern: /sk-proj-[a-zA-Z0-9_-]{48,}/ },
  // AWS - Access keys are exactly AKIA + 16 chars
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  // GitHub tokens
  { name: 'GitHub Token', pattern: /gh[pousr]_[a-zA-Z0-9]{36,}/ },
  { name: 'GitHub PAT', pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/ },
  // Private keys (these are always bad to commit)
  { name: 'Private Key', pattern: /-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP)?\s*PRIVATE KEY-----/ },
  // Anthropic keys
  { name: 'Anthropic API Key', pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/ },
  // OpenRouter keys
  { name: 'OpenRouter API Key', pattern: /sk-or-[a-zA-Z0-9_-]{40,}/ },
];

// Directories and files to ignore when scanning
const IGNORE_DIRS = [
  'node_modules', '.git', 'dist', 'build', 'target', '.next', '__pycache__',
  '.wrapup.json', 'package-lock.json', 'Cargo.lock', '.env.example',
  // Test directories often have fake keys for testing
  'test', 'tests', '__tests__', 'spec', '__mocks__'
];

// File extensions to scan
const SCAN_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.md', '.txt', '.env', '.yaml', '.yml',
  '.toml', '.rs', '.py', '.sh', '.bat', '.ps1',
  '.html', '.css', '.scss', '.config', '.conf'
];

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

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function loadConfig() {
  if (existsSync(CONFIG_FILE)) {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return {};
}

function saveConfig(config) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getDate() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// Dev Server Management
// ─────────────────────────────────────────────────────────────────────────────
let devServerInfo = null;

function detectRunningDevServer() {
  // Check if dev server (npm run tauri:dev or similar) is running
  try {
    if (process.platform === 'win32') {
      // Windows: Check for npm/node processes running tauri dev
      const tasks = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', { 
        encoding: 'utf-8', 
        stdio: 'pipe' 
      });
      
      // Also check for npm/tauri processes
      const npmTasks = execSync('tasklist /FI "IMAGENAME eq npm.cmd" /FO CSV /NH', { 
        encoding: 'utf-8', 
        stdio: 'pipe' 
      }).trim();
      
      if (tasks.includes('node.exe') || npmTasks.includes('npm.cmd')) {
        // We have a dev server candidate, but can't reliably get command line on Windows without admin
        // So we'll just note that something was running and offer to restart tauri:dev
        devServerInfo = {
          wasRunning: true,
          command: 'npm run tauri:dev' // Default assumption
        };
        return true;
      }
    } else {
      // Unix-like: Use ps to check for running processes
      const processes = execSync('ps aux | grep -E "(npm.*tauri:dev|vite|tauri dev)" | grep -v grep', {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
      
      if (processes) {
        devServerInfo = {
          wasRunning: true,
          command: 'npm run tauri:dev'
        };
        return true;
      }
    }
  } catch {
    // No dev server running or error detecting
  }
  return false;
}

function restartDevServer() {
  if (!devServerInfo || !devServerInfo.wasRunning) {
    return;
  }
  
  if (parsedArgs.flags.includes('no-restart')) {
    logInfo('Dev server restart skipped (--no-restart flag)');
    return;
  }
  
  logInfo('Restarting dev server...');
  
  try {
    // Start dev server in detached mode so it runs in background
    // Use platform-specific command to avoid deprecation warning DEP0190
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
    
    child.unref(); // Allow parent to exit independently
    
    logSuccess('Dev server restarted in background (npm run tauri:dev)');
  } catch (e) {
    logWarn(`Failed to restart dev server: ${e.message}`);
    logInfo('You can manually restart with: npm run tauri:dev');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Preflight
// ─────────────────────────────────────────────────────────────────────────────
function preflight() {
  logStep(1, 'Preflight checks');
  
  // Check Node
  const nodeVersion = process.version;
  logInfo(`Node: ${nodeVersion}`);
  
  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    logInfo(`npm: ${npmVersion}`);
  } catch {
    logWarn('npm not found');
  }
  
  // Check Rust (optional)
  try {
    const rustVersion = execSync('rustc --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    logInfo(`Rust: ${rustVersion}`);
  } catch {
    logInfo('Rust: not installed (Tauri builds will fail)');
  }
  
  // Check git
  if (commandExists('git')) {
    const gitVersion = execSync('git --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    logInfo(`Git: ${gitVersion}`);
  } else {
    logWarn('git not found - version control steps will be skipped');
  }
  
  // Check gh (GitHub CLI)
  if (commandExists('gh')) {
    logInfo('GitHub CLI: installed');
  } else {
    logInfo('GitHub CLI: not installed (GitHub features disabled)');
  }
  
  logSuccess('Preflight complete');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Quality Gates
// ─────────────────────────────────────────────────────────────────────────────
function runQualityGates() {
  if (parsedArgs.flags.includes('skip-gates')) {
    logStep(2, 'Quality gates (SKIPPED)');
    return;
  }
  
  logStep(2, 'Running quality gates');
  
  // Lint
  logInfo('Running lint...');
  try {
    run('npm run lint');
    logSuccess('Lint passed');
  } catch (e) {
    logError('Lint failed');
    throw new Error('Quality gate failed: lint');
  }
  
  // Typecheck
  logInfo('Running typecheck...');
  try {
    run('npm run typecheck');
    logSuccess('Typecheck passed');
  } catch (e) {
    logError('Typecheck failed');
    throw new Error('Quality gate failed: typecheck');
  }
  
  // Build
  logInfo('Running build...');
  try {
    run('npm run build');
    logSuccess('Build passed');
  } catch (e) {
    logError('Build failed');
    throw new Error('Quality gate failed: build');
  }
  
  // Rust check (conditional on Cargo.toml existence)
  const cargoTomlPath = existsSync(join(ROOT, 'Cargo.toml')) 
    ? ROOT 
    : existsSync(join(ROOT, 'src-tauri', 'Cargo.toml')) 
      ? join(ROOT, 'src-tauri')
      : null;
      
  if (cargoTomlPath && !parsedArgs.flags.includes('skip-rust')) {
    logInfo('Running Rust check (strict: warnings = errors)...');
    try {
      // Use RUSTFLAGS to treat warnings as errors (strict mode)
      const originalRustflags = process.env.RUSTFLAGS || '';
      process.env.RUSTFLAGS = originalRustflags + ' -D warnings';
      
      run('cargo check --all-targets', { cwd: cargoTomlPath });
      
      // Restore original RUSTFLAGS
      if (originalRustflags) {
        process.env.RUSTFLAGS = originalRustflags;
      } else {
        delete process.env.RUSTFLAGS;
      }
      
      logSuccess('Rust check passed (no warnings or errors)');
    } catch (e) {
      logError('Rust check failed (warnings or errors found)');
      logInfo('Tip: Run "cargo fix --lib -p speakeasy" to auto-fix some issues');
      throw new Error('Quality gate failed: cargo check');
    }
  }
  
  logSuccess('All quality gates passed');

  // Full Tauri release build (creates installer)
  // This runs by default so the one-click installer is always up to date
  if (parsedArgs.flags.includes('skip-release')) {
    logInfo('Skipping Tauri release build (--skip-release flag)');
  } else {
    logInfo('Building Tauri release (installer)... this may take a minute');
    try {
      run('npm run tauri build');
      logSuccess('Tauri release build complete - installer ready!');
    } catch (e) {
      logError('Tauri release build failed');
      throw new Error('Release build failed: tauri build');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Secret Scan
// ─────────────────────────────────────────────────────────────────────────────
function scanForSecrets() {
  if (parsedArgs.flags.includes('skip-secrets')) {
    logStep(3, 'Secret scan (SKIPPED)');
    return;
  }
  
  logStep(3, 'Scanning for secrets (safety net)');
  
  const findings = [];
  
  function scanFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const relativePath = filePath.replace(ROOT, '').replace(/\\/g, '/');
      
      // Skip lockfiles, examples, temp files, and the wrapup script itself
      if (relativePath.includes('package-lock') || 
          relativePath.includes('Cargo.lock') ||
          relativePath.includes('.example') ||
          relativePath.includes('.temp') ||
          relativePath.includes('wrapup.mjs') ||
          relativePath.includes('.test.') ||
          relativePath.includes('.spec.') ||
          relativePath.includes('_test.')) {
        return;
      }
      
      for (const { name, pattern } of SECRET_PATTERNS) {
        const match = content.match(pattern);
        if (match) {
          // Check context: skip if it looks like a test/example/mask function
          const matchIndex = content.indexOf(match[0]);
          const lineStart = content.lastIndexOf('\n', matchIndex) + 1;
          const lineEnd = content.indexOf('\n', matchIndex);
          const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
          
          // Skip obvious test/example patterns
          const skipPatterns = [
            /test/i, /example/i, /fake/i, /mock/i, /dummy/i,
            /assert/i, /expect/i, /mask/i, /redact/i,
            /\/\/.*comment/i, /placeholder/i
          ];
          
          const isTestOrExample = skipPatterns.some(p => p.test(line));
          if (!isTestOrExample) {
            findings.push({ file: relativePath, type: name });
          }
        }
      }
    } catch {
      // Skip files we can't read
    }
  }
  
  function scanDir(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        // Skip ignored directories
        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.includes(entry.name)) {
            scanDir(fullPath);
          }
          continue;
        }
        
        // Only scan known extensions
        const ext = '.' + entry.name.split('.').pop();
        if (SCAN_EXTENSIONS.includes(ext) || entry.name.startsWith('.env')) {
          scanFile(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }
  
  scanDir(ROOT);
  
  if (findings.length > 0) {
    logError('Potential secrets found!');
    for (const { file, type } of findings) {
      logError(`  ${type} in ${file}`);
    }
    log('\n  This is a safety net check. If these are false positives:', colors.yellow);
    log('  - Add them to .gitignore', colors.yellow);
    log('  - Or add the files to IGNORE_DIRS in wrapup.mjs', colors.yellow);
    throw new Error('Secret scan failed - potential secrets detected');
  }
  
  logSuccess('No secrets detected');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Change Summary
// ─────────────────────────────────────────────────────────────────────────────
function getChangeSummary() {
  logStep(4, 'Generating change summary');
  
  let summary = '';
  
  // Try git diff if available
  if (existsSync(join(ROOT, '.git'))) {
    try {
      const staged = execSync('git diff --cached --stat', { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
      const unstaged = execSync('git diff --stat', { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
      const untracked = execSync('git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
      
      if (staged.trim()) summary += `Staged changes:\n${staged}\n`;
      if (unstaged.trim()) summary += `Unstaged changes:\n${unstaged}\n`;
      if (untracked.trim()) summary += `Untracked files:\n${untracked}\n`;
      
      if (summary) {
        logSuccess('Generated summary from git');
        return summary;
      }
    } catch {
      // Fall through to manual
    }
  }
  
  logInfo('No git history - summary will be entered manually');
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 & 6: Lessons Learned
// ─────────────────────────────────────────────────────────────────────────────
async function createLessonsLearned(changeSummary) {
  logStep(5, 'Creating lessons learned entry');
  
  // Ensure directory exists
  if (!existsSync(LESSONS_DIR)) {
    mkdirSync(LESSONS_DIR, { recursive: true });
  }
  
  // Check if we have CLI args (automated mode) or need to prompt (interactive mode)
  const hasCliArgs = parsedArgs.options.area || parsedArgs.options.title || parsedArgs.options.summary;
  
  let area, title, context, symptom, rootCause, fix, verification, prevention, tags;
  
  if (hasCliArgs) {
    // AUTOMATED MODE: Use CLI arguments, no prompts
    logInfo('Using CLI arguments (automated mode)');
    area = parsedArgs.options.area || 'general';
    title = parsedArgs.options.title || 'update';
    context = parsedArgs.options.summary || 'Automated wrap-up';
    symptom = parsedArgs.options.problem || '';
    rootCause = '';
    fix = parsedArgs.options.fix || '';
    verification = 'Quality gates passed (lint, typecheck, build)';
    prevention = '';
    tags = parsedArgs.options.tags || area;
  } else {
    // INTERACTIVE MODE: Prompt for details (fallback)
    log('\n  No CLI args provided. Please provide details for the lessons learned entry:\n', colors.cyan);
    log('  (Tip: Use --area, --title, --summary args for fully automated mode)\n', colors.dim);
    
    area = await prompt('  Area (e.g., tauri-build, frontend, api): ');
    title = await prompt('  Short title: ');
    context = await prompt('  What were you trying to do? ');
    symptom = await prompt('  What went wrong (if anything)? ');
    rootCause = await prompt('  Root cause (if applicable): ');
    fix = await prompt('  What was the fix/solution? ');
    verification = await prompt('  How did you verify it works? ');
    prevention = await prompt('  How to prevent this in the future? ');
    tags = await prompt('  Tags (comma-separated, e.g., frontend, tauri, rust): ');
  }
  
  // Generate filename
  const date = getDate();
  const slug = slugify(title || 'update');
  const areaSlug = slugify(area || 'general');
  const filename = `${date}__${areaSlug}__${slug}.md`;
  const filepath = join(LESSONS_DIR, filename);
  
  // Generate content (skip empty sections in automated mode)
  let content = `# ${title || 'Untitled'}

**Date**: ${date}
**Area**: ${area || 'General'}
**Tags**: ${tags || 'none'}

## Summary
${context || 'N/A'}
`;

  // Only include sections that have content
  if (symptom) {
    content += `
## Problem
${symptom}
`;
  }
  
  if (rootCause) {
    content += `
## Root Cause
${rootCause}
`;
  }
  
  if (fix) {
    content += `
## Fix
${fix}
`;
  }
  
  if (verification) {
    content += `
## Verification
${verification}
`;
  }
  
  if (prevention) {
    content += `
## Prevention
${prevention}
`;
  }
  
  content += `
## Change Summary
\`\`\`
${changeSummary || 'No automatic summary available'}
\`\`\`
`;

  writeFileSync(filepath, content);
  logSuccess(`Created: lessons-learned/${filename}`);
  
  // Update index
  logStep(6, 'Updating lessons learned index');
  updateLessonsIndex();
  logSuccess('Index updated');
  
  return { filename, title, area, tags };
}

function parseMarkdownLesson(filepath, filename) {
  try {
    const content = readFileSync(filepath, 'utf-8');
    
    // Extract metadata from markdown
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const dateMatch = content.match(/\*\*Date\*\*:\s*(.+)$/m);
    const areaMatch = content.match(/\*\*Area\*\*:\s*(.+)$/m);
    const tagsMatch = content.match(/\*\*Tags\*\*:\s*(.+)$/m);
    const summaryMatch = content.match(/##\s+Summary\s*\n([\s\S]*?)(?=\n##|$)/);
    const problemMatch = content.match(/##\s+Problem\s*\n([\s\S]*?)(?=\n##|$)/);
    const fixMatch = content.match(/##\s+Fix\s*\n([\s\S]*?)(?=\n##|$)/);
    
    return {
      id: filename.replace('.md', ''),
      file: filename,
      title: titleMatch ? titleMatch[1].trim() : 'Untitled',
      date: dateMatch ? dateMatch[1].trim() : 'Unknown',
      area: areaMatch ? areaMatch[1].trim() : 'general',
      tags: tagsMatch ? tagsMatch[1].trim().split(',').map(t => t.trim()) : [],
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      problem: problemMatch ? problemMatch[1].trim() : '',
      fix: fixMatch ? fixMatch[1].trim() : ''
    };
  } catch {
    return null;
  }
}

function updateLessonsIndex() {
  const files = readdirSync(LESSONS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md' && f !== '_template.md')
    .sort()
    .reverse(); // Most recent first
  
  // Build markdown index
  let index = `# Lessons Learned Index

This directory contains lessons learned from development sessions.
Updated: ${new Date().toISOString()}

## Entries

| Date | Area | Title |
|------|------|-------|
`;

  // Build JSON index
  const jsonEntries = [];

  for (const file of files) {
    // Parse filename: YYYY-MM-DD__area__title.md
    const match = file.match(/^(\d{4}-\d{2}-\d{2})__([^_]+)__(.+)\.md$/);
    if (match) {
      const [, date, area, titleSlug] = match;
      const title = titleSlug.replace(/-/g, ' ');
      index += `| ${date} | ${area} | [${title}](${file}) |\n`;
      
      // Parse the markdown file for JSON index
      const filepath = join(LESSONS_DIR, file);
      const parsed = parseMarkdownLesson(filepath, file);
      if (parsed) {
        jsonEntries.push(parsed);
      }
    } else {
      // Fallback for non-standard names
      index += `| - | - | [${file}](${file}) |\n`;
      
      // Try to parse anyway for JSON
      const filepath = join(LESSONS_DIR, file);
      const parsed = parseMarkdownLesson(filepath, file);
      if (parsed) {
        jsonEntries.push(parsed);
      }
    }
  }
  
  index += `
## How to add entries

Run \`npm run wrapup\` at the end of each task to automatically generate entries.

Or manually create files following the naming convention:
\`YYYY-MM-DD__area__short-title.md\`

## Search

To search lessons learned programmatically, use the [\`index.json\`](index.json) file or run:
\`\`\`
npm run lessons:search "<query>"
\`\`\`
`;

  // Write markdown index
  writeFileSync(LESSONS_INDEX, index);
  
  // Write JSON index
  const jsonIndex = {
    version: '1.0',
    last_updated: new Date().toISOString(),
    count: jsonEntries.length,
    entries: jsonEntries
  };
  writeFileSync(LESSONS_JSON_INDEX, JSON.stringify(jsonIndex, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 7: Version Control
// ─────────────────────────────────────────────────────────────────────────────
async function handleVersionControl(lessonInfo) {
  if (parsedArgs.flags.includes('no-git')) {
    logStep(7, 'Version control (SKIPPED)');
    return;
  }
  
  if (!commandExists('git')) {
    logStep(7, 'Version control (git not available)');
    return;
  }
  
  logStep(7, 'Version control');
  
  const config = loadConfig();
  const gitDir = join(ROOT, '.git');
  
  // Initialize git if needed
  if (!existsSync(gitDir)) {
    logInfo('Initializing git repository...');
    run('git init', { silent: true });
    
    // Create .gitignore if it doesn't exist
    const gitignorePath = join(ROOT, '.gitignore');
    if (!existsSync(gitignorePath)) {
      const gitignore = `# Dependencies
node_modules/

# Build outputs
dist/
build/
src-tauri/target/

# Environment files (may contain secrets)
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Tauri
src-tauri/target/

# Wrapup config (contains local preferences)
.wrapup.json
`;
      writeFileSync(gitignorePath, gitignore);
      logSuccess('Created .gitignore');
    }
    
    logSuccess('Git repository initialized');
  }
  
  // Stage all changes
  logInfo('Staging changes...');
  run('git add -A', { silent: true });
  
  // Check if there are changes to commit
  const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
  if (!status.trim()) {
    logInfo('No changes to commit');
    return;
  }
  
  // Commit
  const commitMsg = lessonInfo 
    ? `wrapup: ${lessonInfo.title || 'update'} [${lessonInfo.area || 'general'}]`
    : `wrapup: ${getDate()} update`;
  
  logInfo(`Committing: "${commitMsg}"`);
  try {
    run(`git commit -m "${commitMsg}"`, { silent: true });
    logSuccess('Changes committed');
  } catch (e) {
    logWarn('Commit failed (maybe no changes?)');
  }
  
  // Handle GitHub
  await handleGitHub(config);
}

async function handleGitHub(config) {
  if (!commandExists('gh')) {
    logInfo('GitHub CLI not installed - skipping GitHub integration');
    return;
  }
  
  // Check if we have a remote
  let hasRemote = false;
  try {
    const remotes = execSync('git remote', { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
    hasRemote = remotes.trim().length > 0;
  } catch {
    // No remotes
  }
  
  if (hasRemote) {
    // Already has remote - just push
    logInfo('Pushing to remote...');
    try {
      run('git push', { silent: true });
      logSuccess('Pushed to remote');
    } catch (e) {
      logWarn('Push failed - you may need to set upstream or authenticate');
    }
    return;
  }
  
  // No remote - check config for preference or CLI flags
  const wantsGitHub = parsedArgs.flags.includes('github') || parsedArgs.flags.includes('github-private');
  const isPrivate = parsedArgs.flags.includes('github-private');
  
  if (config.githubEnabled === false && !wantsGitHub) {
    logInfo('GitHub integration disabled for this project');
    return;
  }
  
  // Get repo name from package.json or directory
  let repoName = 'my-project';
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    repoName = pkg.name || repoName;
  } catch {
    repoName = ROOT.split(/[/\\]/).pop();
  }
  
  // AUTOMATED MODE: --github or --github-private flag provided
  if (wantsGitHub) {
    config.githubEnabled = true;
    saveConfig(config);
    
    logInfo(`Creating GitHub repo: ${repoName} (${isPrivate ? 'private' : 'public'})...`);
    try {
      run(`gh repo create "${repoName}" --${isPrivate ? 'private' : 'public'} --source=. --remote=origin --push`, { silent: true });
      logSuccess('GitHub repo created and pushed!');
      
      // Get and display the URL
      try {
        const url = execSync('gh repo view --json url -q .url', { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' }).trim();
        logSuccess(`Repo URL: ${url}`);
      } catch {
        // Couldn't get URL, that's okay
      }
    } catch (e) {
      logError('Failed to create GitHub repo');
      logInfo('You may need to run: gh auth login');
    }
    return;
  }
  
  // INTERACTIVE MODE: First run without flags - ask user
  if (config.githubEnabled === undefined) {
    log('\n  No GitHub remote configured.', colors.cyan);
    log('  (Tip: Use --github or --github-private for automated mode)\n', colors.dim);
    const answer = await prompt('  Create a GitHub repo and connect it? (y/n): ');
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      config.githubEnabled = true;
      saveConfig(config);
      
      const visibility = await prompt('  Public or private repo? (public/private): ');
      const repoIsPrivate = visibility.toLowerCase() === 'private';
      
      logInfo(`Creating GitHub repo: ${repoName}...`);
      try {
        run(`gh repo create "${repoName}" --${repoIsPrivate ? 'private' : 'public'} --source=. --remote=origin --push`, { silent: true });
        logSuccess('GitHub repo created and pushed!');
        
        // Get and display the URL
        try {
          const url = execSync('gh repo view --json url -q .url', { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' }).trim();
          logSuccess(`Repo URL: ${url}`);
        } catch {
          // Couldn't get URL, that's okay
        }
      } catch (e) {
        logError('Failed to create GitHub repo');
        logInfo('You may need to run: gh auth login');
      }
    } else {
      config.githubEnabled = false;
      saveConfig(config);
      logInfo('GitHub disabled for this project (change in .wrapup.json)');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  // Detect running dev server before we start
  detectRunningDevServer();
  
  log('\n' + '═'.repeat(60), colors.cyan);
  log('  WRAP-UP: End-of-Task Workflow', colors.cyan + colors.bold);
  log('═'.repeat(60), colors.cyan);
  
  try {
    // Step 1: Preflight
    preflight();
    
    // Step 2: Quality gates
    runQualityGates();
    
    // Step 3: Secret scan
    scanForSecrets();
    
    // Step 4: Change summary
    const changeSummary = getChangeSummary();
    
    // Step 5 & 6: Lessons learned
    const lessonInfo = await createLessonsLearned(changeSummary);
    
    // Step 7: Version control
    await handleVersionControl(lessonInfo);
    
    // Done!
    log('\n' + '═'.repeat(60), colors.green);
    log('  WRAP-UP COMPLETE', colors.green + colors.bold);
    log('═'.repeat(60), colors.green);
    log('\n');
    
    // Step 8: Restart dev server if it was running
    restartDevServer();
    
  } catch (e) {
    log('\n' + '═'.repeat(60), colors.red);
    log('  WRAP-UP FAILED', colors.red + colors.bold);
    log('═'.repeat(60), colors.red);
    log(`\n  Error: ${e.message}\n`, colors.red);
    process.exit(1);
  }
}

main();
