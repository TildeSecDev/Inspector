const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
// Ensure JSON body parsing for auth endpoints
router.use(express.json());
const dbPath = path.join(__dirname, '..', 'databases', 'database.sqlite');
const sqliteDb = new sqlite3.Database(dbPath);
let pasetoUtil = null; try { pasetoUtil = require('../security/pasetoUtil'); } catch { /* optional */ }
let refreshStore = null; try { refreshStore = require('../security/refreshStore'); } catch {}

// --- Refresh token rotation (in-memory simple store) ---
// Persistent refresh handling via refreshStore only
function registerRefresh(rt, email){ if(!rt||!email) return; if(refreshStore){ console.log('[auth] registerRefresh issuing', email); refreshStore.issue(email, rt); } }
function revokeRefresh(rt){ if(rt && refreshStore) refreshStore.revoke(rt); }
function rotateRefresh(oldRt, email, newRt){ if(refreshStore){ refreshStore.rotate(email, oldRt, newRt); } }

// --- Ensure isAdmin column + seed admin user (idempotent) ---
try {
  sqliteDb.all("PRAGMA table_info(users)", async (err, rows) => {
    if(err || !rows) return;
    const hasIsAdmin = rows.some(r=>r.name==='isAdmin');
    if(!hasIsAdmin){
      sqliteDb.run('ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0', (e)=>{ if(e) console.warn('[auth:migration] add isAdmin failed', e.message); });
    }
    // Seed admin user
    sqliteDb.get('SELECT * FROM users WHERE email=?', ['admin@example.com'], async (e2, row)=>{
      if(e2) return;
      if(!row){
        try {
          const hash = await bcrypt.hash('admin123', 10);
          sqliteDb.run('INSERT INTO users (name,email,password,isAdmin,userType) VALUES (?,?,?,?,?)', ['admin','admin@example.com', hash,1,'admin'], (e3)=>{
            if(e3) console.warn('[auth:migration] seed admin failed', e3.message); else console.log('[auth:migration] Seeded admin@example.com');
          });
        } catch {}
      } else if(!row.isAdmin){
        sqliteDb.run('UPDATE users SET isAdmin=1 WHERE email=?', ['admin@example.com']);
      }
    });
  });
} catch(e){ console.warn('[auth:migration] init failed', e.message); }

function sendEmailSafe(to, subject, text){
  try { console.log(`[EmailStub] To: ${to} | Subject: ${subject} | Text: ${text}`); } catch {}
}

router.post('/register', async (req, res) => {
  const { name, email, password, organisation } = req.body || {};
  if (!name || !email || !password) return res.json({ success:false, error:'Missing required fields' });
  sqliteDb.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (row) return res.json({ success:false, error:'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    sqliteDb.run('INSERT INTO users (name, email, password, organisation) VALUES (?, ?, ?, ?)', [name, email, hash, organisation||''], async function(err2){
      if (err2) return res.json({ success:false, error:'Registration failed' });
      const userDir = path.join(__dirname, '..', '..', 'frontend', 'client_folders', name);
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      res.cookie('username', name, { httpOnly:false });
      let token=null, refresh=null;
      if(pasetoUtil){
        try {
          token = await pasetoUtil.sign({ sub: email, name, admin:false });
          refresh = await pasetoUtil.signRefresh({ sub: email, name, admin:false });
          registerRefresh(refresh, email);
        } catch(e){ console.warn('[register] token sign failed', e.message); }
      }
      if(token) res.cookie('auth_token', token, { httpOnly:true, sameSite:'Lax', path:'/' });
      if(refresh) res.cookie('refresh_token', refresh, { httpOnly:true, sameSite:'Lax', path:'/auth' });
      sendEmailSafe(email, 'Welcome to BlockBash', `Hello ${name}, your account has been created.`);
      res.json({ success:true, userId:this.lastID, username:name, token });
    });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.json({ success:false, error:'Missing email or password' });
  sqliteDb.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) return res.json({ success:false, error:'Invalid email or password' });
    if(user.email === 'admin@example.com' && !user.isAdmin){ sqliteDb.run('UPDATE users SET isAdmin=1 WHERE id=?', [user.id]); user.isAdmin=1; }
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success:false, error:'Invalid email or password' });
    const userDir = path.join(__dirname, '..', '..', 'frontend', 'client_folders', user.name);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    res.cookie('username', user.name, { httpOnly:false });
    sqliteDb.run('UPDATE userprogresses SET login = ? WHERE name = ? OR email = ?', [new Date().toISOString(), user.name, user.email]);
    let token=null, refresh=null;
    if(pasetoUtil){
      try {
  token = await pasetoUtil.sign({ sub: email, name: user.name, admin: !!user.isAdmin });
  refresh = await pasetoUtil.signRefresh({ sub: email, name: user.name, admin: !!user.isAdmin });
        registerRefresh(refresh, email);
        console.log('[auth:login] issued token admin=', !!user.isAdmin, 'prefix=', token && token.slice(0,4));
      } catch(e){ console.warn('[login] token sign failed', e.message); }
    }
    if(!token){ token = 'fallback-'+Date.now(); }
    if(token) res.cookie('auth_token', token, { httpOnly:true, sameSite:'Lax', path:'/' });
    if(refresh) res.cookie('refresh_token', refresh, { httpOnly:true, sameSite:'Lax', path:'/auth' });
    res.json({ success:true, userId:user.id, username:user.name, token });
  });
});

router.get('/me', async (req, res) => {
  let authHeader = req.headers['authorization'] || '';
  let token = null;
  if(/^Bearer /i.test(authHeader)) token = authHeader.replace(/^Bearer /i,'').trim();
  if(!token && req.cookies && req.cookies.auth_token) token = req.cookies.auth_token;
  // If no token but we have a username cookie, return minimal profile.
  if(!token) {
    if(req.cookies && req.cookies.username) return res.json({ user:{ name:req.cookies.username, admin:false } });
    return res.status(401).json({ error:'missing_token' });
  }
  if(!pasetoUtil) return res.status(200).json({ user:{ anonymous:false, admin:false } });
  try {
  const payload = await pasetoUtil.verify(token);
    return res.json({ user:{ sub: payload.sub, name: payload.name, admin: !!payload.admin } });
  } catch(e){
    console.warn('[auth:me] verify failed', e.message, 'tokenPrefix=', token.slice(0,8));
    // Fallback: attempt dev.<base64> decode
    if(token.startsWith('dev.')) {
      try { const json = Buffer.from(token.slice(4), 'base64url').toString('utf8'); const obj = JSON.parse(json); return res.json({ user:{ sub: obj.sub, name: obj.name, admin: !!obj.admin } }); } catch {}
    }
    // Last resort: cookie username
    if(req.cookies && req.cookies.username) return res.json({ user:{ name:req.cookies.username, admin:false } });
    return res.status(401).json({ error:'invalid_token', details:e.message });
  }
});

router.post('/refresh', async (req, res) => {
  if(!pasetoUtil) return res.status(500).json({ error:'unavailable' });
  const rt = (req.cookies && req.cookies.refresh_token) || null;
  if(!rt) return res.status(401).json({ error:'missing_refresh' });
  let payload; try { payload = await pasetoUtil.verify(rt); } catch(e){ return res.status(401).json({ error:'invalid_refresh', details:e.message }); }
  // persistent validation only
  let okEmail=null;
  await new Promise(r=> refreshStore.isValid(rt,(e,ok,email)=>{ if(e) console.warn('[auth:refresh] isValid error', e); okEmail = ok?email:null; r(); }));
  if(!okEmail) return res.status(401).json({ error:'revoked' });
  if(payload.kind !== 'refresh') return res.status(401).json({ error:'wrong_kind' });
  const { sub, name, admin } = payload;
  // Rotation check handled via revoke on rotate; no in-memory index needed
  try {
  console.log('[auth:refresh] refreshing for', sub);
  const newAccess = await pasetoUtil.sign({ sub, name, admin });
  const newRefresh = await pasetoUtil.signRefresh({ sub, name, admin });
    rotateRefresh(rt, sub, newRefresh);
    res.cookie('auth_token', newAccess, { httpOnly:true, sameSite:'Lax', path:'/' });
    res.cookie('refresh_token', newRefresh, { httpOnly:true, sameSite:'Lax', path:'/auth' });
    return res.json({ access:newAccess });
  } catch(e){ console.warn('[auth:refresh] sign failed', e); return res.status(500).json({ error:'sign_failed', details:e.message }); }
});

// Password reset tables ensured in legacy path; replicate minimal init here
try {
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS password_resets (id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL,token TEXT NOT NULL UNIQUE,expires INTEGER NOT NULL,used INTEGER DEFAULT 0)`);
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,userId TEXT NOT NULL,os TEXT NOT NULL,cmd TEXT NOT NULL,allowed INTEGER NOT NULL,ts INTEGER NOT NULL,exitCode INTEGER,duration INTEGER)`);
} catch(e) { console.error('[auth:init] table init failed', e); }

router.post('/request_password_reset', express.json(), (req,res)=>{
  const { email } = req.body || {}; if(!email) return res.status(400).json({ success:false, error:'Missing email' });
  sqliteDb.get('SELECT * FROM users WHERE email = ?', [email], (err,row)=>{
    if(err) return res.status(500).json({ success:false, error:'DB error' });
    if(!row) return res.json({ success:true });
    const token = crypto.randomBytes(24).toString('hex');
    const expires = Date.now() + 1000*60*30;
    sqliteDb.run('INSERT INTO password_resets (email, token, expires) VALUES (?, ?, ?)', [email, token, expires], function(er2){
      if(er2) return res.status(500).json({ success:false, error:'DB error' });
      const resetLink = `${req.protocol}://${req.get('host')}/pages/welcome.html?resetToken=${token}`;
      sendEmailSafe(email, 'Password Reset', `Reset your password using this link (expires in 30m): ${resetLink}`);
      res.json({ success:true });
    });
  });
});

router.post('/reset_password', express.json(), (req,res)=>{
  const { token, password } = req.body || {}; if(!token || !password) return res.status(400).json({ success:false, error:'Missing token or password' });
  sqliteDb.get('SELECT * FROM password_resets WHERE token = ? AND used = 0', [token], async (err,row)=>{
    if(err) return res.status(500).json({ success:false, error:'DB error' });
    if(!row) return res.status(400).json({ success:false, error:'Invalid token' });
    if(row.expires < Date.now()) return res.status(400).json({ success:false, error:'Token expired' });
    sqliteDb.get('SELECT * FROM users WHERE email = ?', [row.email], async (e2,user)=>{
      if(e2 || !user) return res.status(400).json({ success:false, error:'User not found' });
      const hash = await bcrypt.hash(password, 10);
      sqliteDb.run('UPDATE users SET password = ? WHERE email = ?', [hash, row.email], (e3)=>{
        if(e3) return res.status(500).json({ success:false, error:'DB error' });
        sqliteDb.run('UPDATE password_resets SET used = 1 WHERE token = ?', [token]);
        sendEmailSafe(row.email, 'Password Reset Successful', 'Your password has been updated.');
        res.json({ success:true });
      });
    });
  });
});

router.post('/logout', (req,res)=>{ 
  const rt = (req.cookies && req.cookies.refresh_token) || null; if(rt) revokeRefresh(rt);
  res.clearCookie('username'); res.clearCookie('auth_token'); res.clearCookie('refresh_token');
  res.json({ success:true }); 
});

module.exports = router;
