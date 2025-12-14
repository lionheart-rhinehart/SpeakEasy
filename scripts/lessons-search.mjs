#!/usr/bin/env node
/**
 * lessons-search.mjs - Search lessons learned index
 * 
 * Usage: npm run lessons:search "<query>"
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const INDEX_FILE = join(ROOT, 'lessons-learned', 'index.json');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function main() {
  const query = process.argv[2];
  
  if (!query) {
    console.log(`${colors.yellow}Usage: npm run lessons:search "<query>"${colors.reset}`);
    console.log(`${colors.dim}Example: npm run lessons:search "api key"${colors.reset}`);
    process.exit(1);
  }
  
  if (!existsSync(INDEX_FILE)) {
    console.log(`${colors.yellow}No index found. Run 'npm run wrapup' to generate the index.${colors.reset}`);
    process.exit(1);
  }
  
  const index = JSON.parse(readFileSync(INDEX_FILE, 'utf-8'));
  const searchLower = query.toLowerCase();
  
  // Search in title, summary, area, tags, problem, fix
  const results = index.entries.filter(entry => {
    return entry.title.toLowerCase().includes(searchLower) ||
           entry.summary.toLowerCase().includes(searchLower) ||
           entry.area.toLowerCase().includes(searchLower) ||
           entry.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
           entry.problem.toLowerCase().includes(searchLower) ||
           entry.fix.toLowerCase().includes(searchLower);
  });
  
  if (results.length === 0) {
    console.log(`${colors.yellow}No results found for "${query}"${colors.reset}\n`);
    console.log(`${colors.dim}Try searching for: area names (frontend, backend, tauri), tags, or keywords from summaries${colors.reset}`);
    process.exit(0);
  }
  
  console.log(`${colors.cyan}${colors.bold}\nFound ${results.length} result(s) for "${query}":${colors.reset}\n`);
  
  for (const entry of results) {
    console.log(`${colors.green}${colors.bold}${entry.title}${colors.reset}`);
    console.log(`${colors.dim}  Date: ${entry.date} | Area: ${entry.area} | File: ${entry.file}${colors.reset}`);
    
    if (entry.summary) {
      const summaryPreview = entry.summary.length > 120 
        ? entry.summary.substring(0, 120) + '...' 
        : entry.summary;
      console.log(`  ${summaryPreview}`);
    }
    
    if (entry.tags && entry.tags.length > 0) {
      console.log(`${colors.blue}  Tags: ${entry.tags.join(', ')}${colors.reset}`);
    }
    
    console.log();
  }
  
  console.log(`${colors.dim}Searched ${index.count} total entries${colors.reset}\n`);
}

main();
