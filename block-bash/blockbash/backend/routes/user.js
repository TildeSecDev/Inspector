const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
let getPreferredOS = async ()=> 'kali';
let setPreferredOS = async ()=> false;
try {
  ({ getPreferredOS, setPreferredOS } = require('../../models/UserSettings'));
} catch (e) {
  console.warn('[user-routes] UserSettings load skipped:', e.message);
}
const router = express.Router();
const dbPath = path.join(__dirname, '..', 'databases', 'database.sqlite');
const sqliteDb = new sqlite3.Database(dbPath);

router.get('/preferred_os', async (req,res)=>{
  const username = req.cookies.username; if(!username) return res.status(401).json({ error:'not_authenticated' });
  try {
    const os = await getPreferredOS(username).catch(()=>null);
    if(!os){
      // Best-effort create a default progress record; ignore errors (schema variations tolerated)
      try { sqliteDb.run('INSERT OR IGNORE INTO userprogresses (name,email,login) VALUES (?,?,?)', [username, username, new Date().toISOString()], ()=>{}); } catch {}
      return res.json({ os:'kali' });
    }
    return res.json({ os });
  } catch(e){
    return res.json({ os:'kali' });
  }
});
router.post('/preferred_os', express.json(), async (req,res)=>{
  const username = req.cookies.username; if(!username) return res.status(401).json({ error:'not_authenticated' });
  const { os } = req.body||{}; if(!os || !['kali'].includes(os)) return res.status(400).json({ error:'invalid_os' });
  try { await setPreferredOS(username, os); res.json({ ok:true }); } catch { res.status(500).json({ error:'persist_failed' }); }
});

router.get('/progress', (req,res)=>{
  const userId = req.query.userId; if(!userId) return res.status(400).json({ error:'Missing userId' });
  sqliteDb.get('SELECT achievements FROM userprogresses WHERE email = ? OR name = ? OR id = ?', [userId,userId,userId], (err,row)=>{ if(err || !row) return res.status(404).json({ error:'User not found' }); let achievements=[]; try { achievements = JSON.parse(row.achievements||'[]'); } catch{}; res.json({ achievements }); });
});

router.get('/notifications', (req,res)=>{
  const userId = req.cookies.username || req.query.userId; if(!userId) return res.status(400).json([]);
  sqliteDb.get('SELECT notifications FROM userprogresses WHERE name = ? OR email = ?', [userId,userId], (err,row)=>{ let notifications=[]; try { notifications = row && row.notifications ? JSON.parse(row.notifications):[]; } catch{}; res.json(notifications); });
});
router.post('/notifications/delete', express.json(), (req,res)=>{
  const userId = req.cookies.username || req.body.userId; const idx = req.body.idx;
  if(typeof idx !== 'number' || !userId) return res.status(400).json({ error:'Missing index or user' });
  sqliteDb.get('SELECT notifications FROM userprogresses WHERE name = ? OR email = ?', [userId,userId], (err,row)=>{ let notifications=[]; try { notifications = row && row.notifications ? JSON.parse(row.notifications):[]; } catch{}; notifications.splice(idx,1); sqliteDb.run('UPDATE userprogresses SET notifications = ? WHERE name = ? OR email = ?', [JSON.stringify(notifications), userId,userId], err2=>{ if(err2) return res.status(500).json({ error:'Failed to delete notification' }); res.json({ ok:true }); }); });
});

const upload = multer({ dest: path.join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'images', 'profile_pics') });
router.post('/profile_picture', upload.single('profilePicture'), (req,res)=>{
  const username = req.cookies.username; if(!username || !req.file) return res.status(400).json({ success:false, error:'No file or user' });
  const fileUrl = `/assets/images/profile_pics/${req.file.filename}`;
  sqliteDb.run('UPDATE userprogresses SET profilePicture = ? WHERE name = ? OR email = ?', [fileUrl, username, username], function(err){ if(err) return res.status(500).json({ success:false, error:'DB error' }); res.json({ success:true, url:fileUrl }); });
});

module.exports = router;
