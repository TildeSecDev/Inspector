// Authentication & role middleware extracted from legacy app.js logic
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, '..', 'databases', 'database.sqlite');
const sqliteDb = new sqlite3.Database(dbPath);

function fetchUserByNameOrEmail(nameOrEmail) {
  return new Promise((resolve, reject) => {
    if (!nameOrEmail) return resolve(null);
    sqliteDb.get('SELECT * FROM users WHERE name = ? OR email = ?', [nameOrEmail, nameOrEmail], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

let pasetoUtil = null; try { pasetoUtil = require('../security/pasetoUtil'); } catch {}

async function attachUser(req, _res, next) {
  try {
    // Priority: cookie-based session for backward compatibility
    const username = req.cookies && req.cookies.username;
    if (username) {
      req.user = await fetchUserByNameOrEmail(username);
    }
    // Bearer token support (PASETO or dev token) augments or sets req.user
    let authHeader = req.headers['authorization'] || '';
    let bearer = null;
    if (/^Bearer /i.test(authHeader)) bearer = authHeader.replace(/^Bearer /i,'').trim();
    if (!bearer && req.cookies && req.cookies.auth_token) bearer = req.cookies.auth_token;
    if (bearer && pasetoUtil) {
      try {
        const payload = await pasetoUtil.verify(bearer);
        const email = payload.sub;
        if (email) {
          const dbUser = await fetchUserByNameOrEmail(email);
          if (dbUser) {
            req.user = dbUser;
          } else {
            // Ephemeral user object when not found in DB (shouldn't happen normally)
            req.user = { email, name: payload.name || email.split('@')[0], userType: payload.admin ? 'admin' : 'user', isAdmin: !!payload.admin };
          }
          if (payload.admin) {
            req.user.isAdmin = 1; req.user.userType = 'admin';
          }
        }
      } catch (e) {
        // ignore token errors; user remains as cookie user or unauth
      }
    }
    if (req.user && (req.user.isAdmin === 1 || req.user.isAdmin === true) && req.user.userType !== 'admin') {
      req.user.userType = 'admin';
    }
  } catch {}
  next();
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
  next();
}

function isGlobalAdmin(user) { return user && (user.userType === 'admin' || user.userType === 'superadmin' || user.isAdmin === 1 || user.isAdmin === true); }
function isOrgAdmin(user) { return user && (user.userType === 'orgadmin' || isGlobalAdmin(user)); }

function requireOrgAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
  if (!isOrgAdmin(req.user)) return res.status(403).json({ error: 'not_authorised' });
  next();
}

function requireGlobalAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
  if (!isGlobalAdmin(req.user)) return res.status(403).json({ error: 'not_authorised' });
  next();
}

module.exports = { attachUser, requireUser, requireOrgAdmin, requireGlobalAdmin, isGlobalAdmin, isOrgAdmin };
