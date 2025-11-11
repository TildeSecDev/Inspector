// Persistent refresh token store using SQLite
// Schema: refresh_tokens(token PRIMARY KEY, email, issued, expires, revoked, updated_at)
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const DB_PATH = path.join(process.cwd(), 'databases', 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

db.serialize(()=>{
  db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      issued INTEGER NOT NULL,
      expires INTEGER NOT NULL,
      revoked INTEGER DEFAULT 0,
      updated_at INTEGER
    )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_email ON refresh_tokens(email)');
  // Migration: ensure updated_at column exists (older installs lacked it)
  db.all(`PRAGMA table_info(refresh_tokens)`, (err, rows)=>{
    if(!err){
      const hasUpdated = rows.some(r=> r.name === 'updated_at');
      if(!hasUpdated){
        db.run('ALTER TABLE refresh_tokens ADD COLUMN updated_at INTEGER', ()=>{});
      }
    }
  });
});

function now(){ return Math.floor(Date.now()/1000); }

function issue(email, token, ttlSeconds){
  if(!email || !token) return;
  const issued = now();
  const expires = issued + (ttlSeconds || 60*60*24*7);
  // Revoke existing active tokens for this email
  db.run('UPDATE refresh_tokens SET revoked=1, updated_at=? WHERE email=? AND revoked=0', [Date.now(), email]);
  db.run('INSERT OR REPLACE INTO refresh_tokens(token,email,issued,expires,revoked,updated_at) VALUES (?,?,?,?,0,?)', [token,email,issued,expires,Date.now()]);
}

function revoke(token){ if(!token) return; db.run('UPDATE refresh_tokens SET revoked=1, updated_at=? WHERE token=?', [Date.now(), token]); }

function isValid(token, cb){
  if(!token) return cb(null,false,null);
  db.get('SELECT email, expires, revoked FROM refresh_tokens WHERE token=?', [token], (err,row)=>{
    if(err || !row) return cb(null,false,null);
    if(row.revoked) return cb(null,false,null);
    if(row.expires < now()) return cb(null,false,null);
    cb(null,true,row.email);
  });
}

function rotate(email, oldToken, newToken, ttlSeconds){
  if(oldToken) revoke(oldToken);
  issue(email, newToken, ttlSeconds);
}

module.exports = { issue, revoke, isValid, rotate };