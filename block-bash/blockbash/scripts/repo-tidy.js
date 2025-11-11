#!/usr/bin/env node
/**
 * Simple repository hygiene checker.
 * Warns if disallowed file patterns appear at repo root.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const allowedRoot = new Set([
  'README.md','LICENSE','package.json','package-lock.json','docker-compose.yml','node_modules','backend','frontend','public','docs','scripts','tests','coverage','databases','bin','lib','models','online','misc','.github','.gitignore','.env.example','assets','legacy','CLEANUP.md',
  '.vscode','.venv','server.log'
]);

const entries = fs.readdirSync(ROOT).filter(f=>!f.startsWith('.git'));
let issues = [];
for(const e of entries){
  if(e === '.DS_Store') { // auto-remove macOS metadata
    try { fs.unlinkSync(path.join(ROOT,e)); console.log('Removed stray .DS_Store'); } catch {}
    continue;
  }
  if(!allowedRoot.has(e)) {
    const stat = fs.statSync(path.join(ROOT,e));
    if(stat.isFile()) issues.push(`Unexpected root file: ${e}`);
    else if(stat.isDirectory()) issues.push(`Unexpected root directory: ${e}/`);
  }
}

if(issues.length){
  console.log('Repo tidy warnings:');
  for(const i of issues) console.log(' -', i);
  process.exitCode = 0; // non-fatal
} else {
  console.log('Repo tidy: no issues');
}