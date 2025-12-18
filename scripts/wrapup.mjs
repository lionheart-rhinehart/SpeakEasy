#!/usr/bin/env node
/**
 * wrapup.mjs - Finalize and commit after testing
 *
 * Usage: npm run wrapup -- [options]
 *
 * This command should be run AFTER /test-protocol and manual testing.
 * It reads test-protocol results (if available) and incorporates them
 * into the lessons learned documentation.
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
 *   --skip-secrets   Skip secret scanning
 *   --no-git         Skip git operations
 *   --github         Create public GitHub repo (automated, no prompt)
 *   --github-private Create private GitHub repo (automated, no prompt)
 *
 * Example (fully automated, no prompts):
 *   npm run wrapup -- --github-private --area "devops" --title "add-wrapup-sop" --summary "Added automated end-of-task workflow"
 */

import { execSync, spawnSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync } from 'fs';
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
const TEST_PROTOCOL_STATE_FILE = join(ROOT, '.test-protocol-result.json');
const TEST_PROTOCOL_ARCHIVED_FILE = join(ROOT, '.test-protocol-result.archived.json');

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
// Test Protocol Results
// ─────────────────────────────────────────────────────────────────────────────
function readTestProtocolResult() {
  if (!existsSync(TEST_PROTOCOL_STATE_FILE)) {
    logInfo('No test-protocol result found - proceeding without test context');
    return null;
  }

  try {
    const state = JSON.parse(readFileSync(TEST_PROTOCOL_STATE_FILE, 'utf-8'));

    // Check if it's recent (within last 2 hours)
    const timestamp = new Date(state.timestamp);
    const ageHours = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);

    if (ageHours > 2) {
      logWarn(`Test protocol result is ${ageHours.toFixed(1)} hours old - may be stale`);
    }

    logSuccess(`Found test-protocol result from ${timestamp.toLocaleString()}`);
    logInfo(`Status: ${state.overall_status}`);

    // Collect issues from steps
    const issues = [];
    for (const step of state.steps || []) {
      if (step.warnings && step.warnings.length > 0) {
        issues.push(...step.warnings.map(w => `[${step.name}] Warning: ${w}`));
      }
      if (step.errors && step.errors.length > 0) {
        issues.push(...step.errors.map(e => `[${step.name}] Error: ${e}`));
      }
    }

    if (issues.length > 0) {
      logWarn(`Found ${issues.length} issue(s) from test-protocol`);
    }

    return { ...state, issues };
  } catch (e) {
    logWarn(`Failed to read test-protocol result: ${e.message}`);
    return null;
  }
}

function archiveTestProtocolResult() {
  if (existsSync(TEST_PROTOCOL_STATE_FILE)) {
    try {
      // Copy to archived file (overwrites any previous archive)
      writeFileSync(TEST_PROTOCOL_ARCHIVED_FILE, readFileSync(TEST_PROTOCOL_STATE_FILE));
      unlinkSync(TEST_PROTOCOL_STATE_FILE);
      logInfo('Archived test-protocol result');
    } catch (e) {
      logWarn(`Failed to archive test-protocol result: ${e.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Secret Scan (safety net before git push)
// ─────────────────────────────────────────────────────────────────────────────
function scanForSecrets() {
  if (parsedArgs.flags.includes('skip-secrets')) {
    logStep(1, 'Secret scan (SKIPPED)');
    return;
  }
  
  logStep(1, 'Scanning for secrets (safety net)');
  
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
// Step 2: Change Summary
// ─────────────────────────────────────────────────────────────────────────────
function getChangeSummary() {
  logStep(2, 'Generating change summary');
  
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
// Step 3: Lessons Learned
// ─────────────────────────────────────────────────────────────────────────────
async function createLessonsLearned(changeSummary, testProtocolResult) {
  logStep(3, 'Creating lessons learned entry');

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

    // Use test-protocol status for verification if available
    if (testProtocolResult && testProtocolResult.overall_status === 'success') {
      verification = 'Test protocol passed - app tested manually';
    } else {
      verification = 'Tested via manual verification';
    }

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

  // Add test protocol results if available
  if (testProtocolResult) {
    content += `
## Test Protocol Results
- **Status**: ${testProtocolResult.overall_status}
- **Duration**: ${testProtocolResult.duration_seconds}s
- **Timestamp**: ${testProtocolResult.timestamp}
`;

    if (testProtocolResult.build_info && testProtocolResult.build_info.installer_path) {
      content += `- **Build**: ${testProtocolResult.build_info.installer_path}
`;
    }

    // Add step summary
    if (testProtocolResult.steps && testProtocolResult.steps.length > 0) {
      content += `
### Steps
`;
      for (const step of testProtocolResult.steps) {
        content += `- ${step.name}: ${step.status} (${step.duration_ms}ms)
`;
      }
    }

    // Add issues if any
    if (testProtocolResult.issues && testProtocolResult.issues.length > 0) {
      content += `
### Issues Noted
`;
      for (const issue of testProtocolResult.issues) {
        content += `- ${issue}
`;
      }
    }
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
  logStep(3, 'Updating lessons learned index');
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
// Step 4: Version Control
// ─────────────────────────────────────────────────────────────────────────────
async function handleVersionControl(lessonInfo) {
  if (parsedArgs.flags.includes('no-git')) {
    logStep(4, 'Version control (SKIPPED)');
    return;
  }

  if (!commandExists('git')) {
    logStep(4, 'Version control (git not available)');
    return;
  }

  logStep(4, 'Version control');
  
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
    // Already has remote - push with upstream tracking
    logInfo('Pushing to remote...');
    try {
      const branch = execSync('git branch --show-current', { cwd: ROOT, encoding: 'utf-8' }).trim();
      run(`git push -u origin ${branch}`, { silent: true });
      logSuccess('Pushed to remote');
    } catch (e) {
      logWarn('Push failed - you may need to authenticate');
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
  log('\n' + '═'.repeat(60), colors.cyan);
  log('  WRAP-UP: Finalize & Commit', colors.cyan + colors.bold);
  log('═'.repeat(60), colors.cyan);

  try {
    // Read test-protocol results if available
    const testProtocolResult = readTestProtocolResult();

    // Step 1: Secret scan (safety net before git push)
    scanForSecrets();

    // Step 2: Change summary
    const changeSummary = getChangeSummary();

    // Step 3: Lessons learned (incorporates test-protocol results)
    const lessonInfo = await createLessonsLearned(changeSummary, testProtocolResult);

    // Step 4: Version control
    await handleVersionControl(lessonInfo);

    // Archive test-protocol result after successful wrapup
    archiveTestProtocolResult();

    // Done!
    log('\n' + '═'.repeat(60), colors.green);
    log('  WRAP-UP COMPLETE', colors.green + colors.bold);
    log('═'.repeat(60), colors.green);
    log('\n');

  } catch (e) {
    log('\n' + '═'.repeat(60), colors.red);
    log('  WRAP-UP FAILED', colors.red + colors.bold);
    log('═'.repeat(60), colors.red);
    log(`\n  Error: ${e.message}\n`, colors.red);
    process.exit(1);
  }
}

main();
