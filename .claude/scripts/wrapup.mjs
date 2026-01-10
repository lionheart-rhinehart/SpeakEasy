#!/usr/bin/env node
/**
 * wrapup.mjs - Finalize session with lessons learned and git commit
 *
 * Usage: node scripts/wrapup.mjs [options]
 *
 * Lesson fields (provide to skip prompts):
 *   --area "frontend"        Area/category of the work
 *   --title "fix-auth-bug"   Short title for the lesson
 *   --summary "What was done" Context/summary of the work
 *   --problem "What broke"   Problem encountered (optional)
 *   --fix "How fixed"        The solution (optional)
 *   --tags "tag1,tag2"       Comma-separated tags (optional)
 *
 * Build order fields:
 *   --feature "F-100"        Feature ID to mark complete
 *   --status "completed"     Status to set (default: completed)
 *
 * Control flags:
 *   --skip-secrets    Skip secret scanning
 *   --no-git          Skip git operations
 *   --no-lessons      Skip lessons learned
 *   --no-build-order  Skip build order update
 *
 * This script:
 * - Scans for secrets (safety net before commit)
 * - Creates lessons-learned entry
 * - Commits and pushes changes
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = process.cwd();

const LESSONS_DIR = join(ROOT, 'docs', 'lessons-learned');
const TEST_PROTOCOL_STATE = join(ROOT, '.test-protocol-result.json');

// Secret patterns to scan for
const SECRET_PATTERNS = [
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9_-]{48,}/ },
  { name: 'OpenAI Project Key', pattern: /sk-proj-[a-zA-Z0-9_-]{48,}/ },
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', pattern: /gh[pousr]_[a-zA-Z0-9]{36,}/ },
  { name: 'Private Key', pattern: /-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP)?\s*PRIVATE KEY-----/ },
  { name: 'Anthropic API Key', pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/ },
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'target', '.next'];
const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.json', '.md', '.env', '.yaml', '.yml'];

// Parse arguments
function parseArgs(argv) {
  const args = { flags: [], options: {} };
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

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(msg, color = '') { console.log(`${color}${msg}${colors.reset}`); }
function logStep(step, msg) { log(`\n[STEP ${step}] ${msg}`, colors.cyan + colors.bold); }
function logSuccess(msg) { log(`  ✓ ${msg}`, colors.green); }
function logError(msg) { log(`  ✗ ${msg}`, colors.red); }
function logWarn(msg) { log(`  ⚠ ${msg}`, colors.yellow); }
function logInfo(msg) { log(`  → ${msg}`, colors.dim); }

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

function getDate() {
  return new Date().toISOString().split('T')[0];
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
}

function commandExists(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

// Secret scanning
function scanForSecrets() {
  if (parsedArgs.flags.includes('skip-secrets')) {
    logInfo('Skipped via --skip-secrets flag');
    return true;
  }

  const findings = [];

  function scanFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const relativePath = filePath.replace(ROOT, '').replace(/\\/g, '/');

      if (relativePath.includes('.example') || relativePath.includes('wrapup.mjs')) return;

      for (const { name, pattern } of SECRET_PATTERNS) {
        if (pattern.test(content)) {
          findings.push({ file: relativePath, type: name });
        }
      }
    } catch {}
  }

  function scanDir(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.includes(entry.name)) scanDir(fullPath);
        } else {
          const ext = '.' + entry.name.split('.').pop();
          if (SCAN_EXTENSIONS.includes(ext) || entry.name.startsWith('.env')) {
            scanFile(fullPath);
          }
        }
      }
    } catch {}
  }

  scanDir(ROOT);

  if (findings.length > 0) {
    logError('Potential secrets found!');
    for (const { file, type } of findings) {
      logError(`  ${type} in ${file}`);
    }
    return false;
  }

  logSuccess('No secrets detected');
  return true;
}

// Read test-protocol result
function readTestProtocolResult() {
  if (!existsSync(TEST_PROTOCOL_STATE)) return null;
  try {
    return JSON.parse(readFileSync(TEST_PROTOCOL_STATE, 'utf-8'));
  } catch { return null; }
}

// Create lessons learned entry
async function createLessonsLearned(testResult) {
  if (parsedArgs.flags.includes('no-lessons')) {
    logInfo('Skipped via --no-lessons flag');
    return null;
  }

  // Ensure directory exists
  if (!existsSync(LESSONS_DIR)) {
    mkdirSync(LESSONS_DIR, { recursive: true });
  }

  const hasCliArgs = parsedArgs.options.area || parsedArgs.options.title || parsedArgs.options.summary;

  let area, title, summary, problem, fix, tags;

  if (hasCliArgs) {
    logInfo('Using CLI arguments (automated mode)');
    area = parsedArgs.options.area || 'general';
    title = parsedArgs.options.title || 'update';
    summary = parsedArgs.options.summary || 'Session update';
    problem = parsedArgs.options.problem || '';
    fix = parsedArgs.options.fix || '';
    tags = parsedArgs.options.tags || area;
  } else {
    log('\n  Provide details for lessons learned:\n', colors.cyan);
    area = await prompt('  Area (e.g., frontend, backend, devops): ');
    title = await prompt('  Short title: ');
    summary = await prompt('  What was done? ');
    problem = await prompt('  What went wrong (if anything)? ');
    fix = await prompt('  How was it fixed? ');
    tags = await prompt('  Tags (comma-separated): ');
  }

  const date = getDate();
  const slug = slugify(title || 'update');
  const areaSlug = slugify(area || 'general');
  const filename = `${date}__${areaSlug}__${slug}.md`;
  const filepath = join(LESSONS_DIR, filename);

  let content = `# ${title || 'Update'}

**Date**: ${date}
**Area**: ${area || 'General'}
**Tags**: ${tags || 'none'}

## Summary
${summary || 'N/A'}
`;

  if (problem) content += `\n## Problem\n${problem}\n`;
  if (fix) content += `\n## Fix\n${fix}\n`;

  if (testResult) {
    content += `\n## Test Protocol Results
- **Status**: ${testResult.overall_status}
- **Duration**: ${testResult.duration_seconds}s
- **Project Type**: ${testResult.project_type}
`;
  }

  writeFileSync(filepath, content);
  logSuccess(`Created: docs/lessons-learned/${filename}`);

  // Update index
  updateLessonsIndex();

  return { filename, title, area };
}

function updateLessonsIndex() {
  const indexPath = join(LESSONS_DIR, 'README.md');
  const files = readdirSync(LESSONS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .reverse();

  let index = `# Lessons Learned

Updated: ${new Date().toISOString()}

## Entries

| Date | Area | Title |
|------|------|-------|
`;

  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})__([^_]+)__(.+)\.md$/);
    if (match) {
      const [, date, area, titleSlug] = match;
      const title = titleSlug.replace(/-/g, ' ');
      index += `| ${date} | ${area} | [${title}](${file}) |\n`;
    }
  }

  writeFileSync(indexPath, index);
  logSuccess('Index updated');
}

// Git operations
async function handleGit(lessonInfo) {
  if (parsedArgs.flags.includes('no-git')) {
    logInfo('Skipped via --no-git flag');
    return;
  }

  if (!commandExists('git') || !existsSync(join(ROOT, '.git'))) {
    logInfo('No git repository found');
    return;
  }

  // Stage all changes
  logInfo('Staging changes...');
  try {
    execSync('git add -A', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    logWarn('Failed to stage changes');
    return;
  }

  // Check for changes
  const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' }).trim();
  if (!status) {
    logInfo('No changes to commit');
    return;
  }

  // Commit
  const commitMsg = lessonInfo
    ? `wrapup: ${lessonInfo.title || 'update'} [${lessonInfo.area || 'general'}]`
    : `wrapup: ${getDate()} update`;

  logInfo(`Committing: "${commitMsg}"`);
  try {
    execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT, stdio: 'pipe' });
    logSuccess('Changes committed');
  } catch (e) {
    logWarn('Commit failed');
    return;
  }

  // Push
  try {
    const hasRemote = execSync('git remote', { cwd: ROOT, encoding: 'utf-8' }).trim();
    if (hasRemote) {
      logInfo('Pushing to remote...');
      const branch = execSync('git branch --show-current', { cwd: ROOT, encoding: 'utf-8' }).trim();
      execSync(`git push origin ${branch}`, { cwd: ROOT, stdio: 'pipe' });
      logSuccess('Pushed to remote');
    }
  } catch (e) {
    logWarn('Push failed - you may need to push manually');
  }
}

// Build order update
function updateBuildOrder(featureId, newStatus = 'completed') {
  if (parsedArgs.flags.includes('no-build-order')) {
    logInfo('Skipped via --no-build-order flag');
    return false;
  }

  const buildOrderPath = join(ROOT, 'docs', 'build-order.md');

  if (!existsSync(buildOrderPath)) {
    logInfo('No build-order.md found, skipping');
    return false;
  }

  let content = readFileSync(buildOrderPath, 'utf-8');

  // Regex to match the feature row in the Queue table
  // Format: | # | F-XXX | Feature Name | status | phase | deps | notes |
  const featureRegex = new RegExp(
    `(\\|[^|]+\\|\\s*${featureId}\\s*\\|[^|]+\\|\\s*)(\\w+(?:-\\w+)?)(\\s*\\|)`,
    'i'
  );

  if (!featureRegex.test(content)) {
    logWarn(`Feature ${featureId} not found in build-order.md`);
    return false;
  }

  // Update the status
  content = content.replace(featureRegex, `$1${newStatus}$3`);

  // Always update "Ready to Claim" section after status change
  content = updateReadyToClaim(content);

  writeFileSync(buildOrderPath, content);
  logSuccess(`Updated ${featureId} to ${newStatus} in build-order.md`);
  return true;
}

function updateReadyToClaim(content) {
  // Parse the Queue table to find features whose dependencies are all completed
  const queueMatch = content.match(/## Queue[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n([\s\S]*?)(?=\n---|\n##|$)/);
  if (!queueMatch) return content;

  const tableRows = queueMatch[1].trim().split('\n').filter(r => r.startsWith('|'));
  const features = [];

  for (const row of tableRows) {
    const cells = row.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 6) {
      features.push({
        num: cells[0],
        id: cells[1],
        name: cells[2],
        status: cells[3],
        phase: cells[4],
        deps: cells[5],
        notes: cells[6] || ''
      });
    }
  }

  // Find all completed feature IDs
  const completedIds = features
    .filter(f => f.status === 'completed')
    .map(f => f.id.toUpperCase());

  const readyFeatures = features.filter(f => {
    if (f.status !== 'pending') return false;
    if (f.deps.toLowerCase() === 'none') return true;

    const deps = f.deps.split(',').map(d => d.trim().toUpperCase());
    return deps.every(d => completedIds.includes(d));
  });

  if (readyFeatures.length === 0) return content;

  // Build new Ready to Claim section
  let newReadySection = `## Ready to Claim (No Unmet Dependencies)

These features can be started immediately:

| ID | Feature | Requirements Count |
|----|---------|-------------------|
`;

  for (const f of readyFeatures) {
    newReadySection += `| ${f.id} | ${f.name} | See SRS |\n`;
  }

  // Replace existing Ready to Claim section
  const readyRegex = /## Ready to Claim[^#]*(?=\n---|\n##)/;
  if (readyRegex.test(content)) {
    content = content.replace(readyRegex, newReadySection);
  }

  return content;
}

// Main
async function main() {
  log('\n' + '═'.repeat(60), colors.cyan);
  log('  WRAPUP', colors.cyan + colors.bold);
  log('═'.repeat(60), colors.cyan);

  try {
    // Step 1: Secret scan
    logStep(1, 'Secret scan');
    if (!scanForSecrets()) {
      throw new Error('Secret scan failed - potential secrets detected');
    }

    // Step 2: Read test-protocol result
    logStep(2, 'Check test-protocol result');
    const testResult = readTestProtocolResult();
    if (testResult) {
      logSuccess(`Found result: ${testResult.overall_status} (${testResult.duration_seconds}s)`);
    } else {
      logInfo('No test-protocol result found');
    }

    // Step 3: Lessons learned
    logStep(3, 'Lessons learned');
    const lessonInfo = await createLessonsLearned(testResult);

    // Step 4: Git operations
    logStep(4, 'Git commit and push');
    await handleGit(lessonInfo);

    // Step 5: Update build order
    logStep(5, 'Update build order');
    let featureId = parsedArgs.options.feature;

    // Auto-detect from tags if no explicit feature
    if (!featureId && parsedArgs.options.tags) {
      const featureMatch = parsedArgs.options.tags.match(/F-\d+/i);
      if (featureMatch) {
        featureId = featureMatch[0].toUpperCase();
        logInfo(`Auto-detected feature from tags: ${featureId}`);
      }
    }

    if (featureId) {
      const status = parsedArgs.options.status || 'completed';
      updateBuildOrder(featureId, status);
    } else {
      logInfo('No feature specified, skipping build order update');
      logInfo('Use --feature F-XXX to update build order');
    }

    // Done
    log('\n' + '═'.repeat(60), colors.green);
    log('  WRAPUP COMPLETE', colors.green + colors.bold);
    log('═'.repeat(60), colors.green);
    log('\n');

  } catch (e) {
    log('\n' + '═'.repeat(60), colors.red);
    log('  WRAPUP FAILED', colors.red + colors.bold);
    log('═'.repeat(60), colors.red);
    log(`\n  Error: ${e.message}\n`, colors.red);
    process.exit(1);
  }
}

main();
