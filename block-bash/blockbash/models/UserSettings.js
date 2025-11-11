// UserSettings: extend users table with preferred_os if not exists and expose getter/setter.
// Uses the primary sqlite database at backend/databases/database.sqlite
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
let db;
try {
  const dbPath = path.join(__dirname, '..', 'backend', 'databases', 'database.sqlite');
  db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run('ALTER TABLE users ADD COLUMN preferred_os TEXT DEFAULT "kali"', err => {
      if (err && !/duplicate column/i.test(err.message)) {
        console.warn('preferred_os migration notice:', err.message);
      }
    });
  });
} catch (e) {
  console.warn('[UserSettings] Failed to open sqlite database:', e.message);
}

function getPreferredOS(username) {
  if (!db) return Promise.resolve('kali');
  return new Promise((resolve, reject) => {
    db.get('SELECT preferred_os FROM users WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      resolve((row && row.preferred_os) ? row.preferred_os : 'kali');
    });
  });
}

function setPreferredOS(username, os) {
  if (!db) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET preferred_os = ? WHERE username = ?', [os, username], function(err) {
      if (err) return reject(err);
      resolve(this.changes > 0);
    });
  });
}

module.exports = { getPreferredOS, setPreferredOS };
