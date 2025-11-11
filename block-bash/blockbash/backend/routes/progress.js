const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const dbPath = path.join(__dirname, '..', 'databases', 'database.sqlite');
const sqliteDb = new sqlite3.Database(dbPath);

// Ensure required columns exist (progress, achievements, storyCompletions)
try {
  sqliteDb.all('PRAGMA table_info(users)', (err, rows) => {
    if (err || !Array.isArray(rows)) return;
    const names = rows.map(r => r.name);
    const alters = [];
    if (!names.includes('progress')) alters.push("ALTER TABLE users ADD COLUMN progress TEXT");
    if (!names.includes('achievements')) alters.push("ALTER TABLE users ADD COLUMN achievements TEXT");
    if (!names.includes('storyCompletions')) alters.push("ALTER TABLE users ADD COLUMN storyCompletions TEXT");
    alters.forEach(sql => { try { sqliteDb.run(sql); } catch {} });
  });
} catch {}

router.post('/', express.json(), (req,res)=>{
  const { userId, lesson_id, get, removeSkill, resetStory, ...progress } = req.body || {};
  if(!userId) return res.status(400).json({ error:'Missing userId' });
  sqliteDb.get('SELECT * FROM users WHERE id = ? OR name = ? OR email = ?', [userId,userId,userId], (err,row)=>{
    if(err || !row) return res.status(404).json({ error:'User not found' });
    if(get){ let progressObj={}, achievements=[], storyCompletions=[]; try { progressObj = JSON.parse(row.progress||'{}'); } catch{}; try { achievements = JSON.parse(row.achievements||'[]'); } catch{}; try { storyCompletions = JSON.parse(row.storyCompletions||'[]'); } catch{}; return res.json({ progress:progressObj, achievements, storyCompletions }); }
    if(removeSkill){ let achievements=[]; try { achievements = JSON.parse(row.achievements||'[]'); } catch{}; achievements = achievements.filter(s=>s!==removeSkill); sqliteDb.run('UPDATE users SET achievements = ? WHERE id = ?', [JSON.stringify(achievements), row.id], err2=>{ if(err2) return res.status(500).json({ error:'Database error' }); return res.json({ ok:true }); }); return; }
    if(resetStory) return res.json({ ok:true });
    const updates=[]; if(progress && Object.keys(progress).length>0) updates.push(`progress = '${JSON.stringify(progress)}'`); if(req.body.achievements) updates.push(`achievements = '${JSON.stringify(req.body.achievements)}'`);
  if(updates.length>0){ const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`; sqliteDb.run(sql, [row.id], err3=>{ if(err3) return res.status(500).json({ error:'Database error' }); return res.json({ ok:true }); }); } else { return res.json({ ok:true }); }
  });
});

module.exports = router;
