// Simple maintenance script to prune expired or long-revoked refresh tokens.
// Usage: node backend/security/pruneRefreshTokens.js
// Optionally set PRUNE_MAX_REVOKED_AGE_MS (default 7 days) to also delete revoked tokens older than retention.
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(process.cwd(), 'databases', 'database.sqlite');
const RETAIN_REVOKED_MS = parseInt(process.env.PRUNE_MAX_REVOKED_AGE_MS || '',10) || 7*24*60*60*1000; // 7 days

function prune(){
  const db = new sqlite3.Database(DB_PATH);
  const now = Date.now();
  const expiredSql = `DELETE FROM refresh_tokens WHERE expires > 0 AND expires < ?`;
  const revokedSql = `DELETE FROM refresh_tokens WHERE revoked = 1 AND updated_at IS NOT NULL AND (strftime('%s','now')*1000 - updated_at) > ?`;
  db.serialize(()=>{
    db.run('PRAGMA journal_mode=WAL;');
    db.run('PRAGMA synchronous=NORMAL;');
    db.run(expiredSql, [now], function(err){
      if(err) console.error('Prune expired error', err.message); else console.log('Pruned expired tokens:', this.changes);
      db.run(revokedSql, [RETAIN_REVOKED_MS], function(err2){
        if(err2) console.error('Prune revoked error', err2.message); else console.log('Pruned old revoked tokens:', this.changes);
        db.close();
      });
    });
  });
}

if(require.main === module){
  prune();
}

module.exports = prune;
