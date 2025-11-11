// Simple sync: copy frontend/public -> public (shallow + recursive)
// Ensures /editor and related assets are served from expected /public paths.

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'frontend', 'public');
const DST = path.join(__dirname, '..', 'public');

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const e of entries) {
      copyRecursive(path.join(src, e), path.join(dst, e));
    }
  } else if (stat.isFile()) {
    // Only overwrite if different size or missing to keep quick
    let needCopy = true;
    try {
      const dstat = fs.statSync(dst);
      if (dstat.size === stat.size) needCopy = false;
    } catch {}
    if (needCopy) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    }
  }
}

try {
  copyRecursive(SRC, DST);
  console.log('[sync] Copied frontend/public -> public');
} catch (e) {
  console.warn('[sync] Failed to copy frontend/public -> public:', e.message);
}

