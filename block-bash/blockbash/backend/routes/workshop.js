const express = require('express');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const router = express.Router();
const EXAMPLES_ROOT = path.resolve(__dirname, '..', '..', 'online', 'examples');

router.get('/workshop', async (req,res)=>{
  const lessonId = req.query.lesson_id; if(!lessonId) return res.status(400).json({ error:'Missing lesson_id' });
  let tldsPath = path.join(EXAMPLES_ROOT, lessonId + '.tlds');
  if (!fs.existsSync(tldsPath)) { tldsPath = path.join(EXAMPLES_ROOT, 'Topics', lessonId.replace(/^Topics\//,'') + '.tlds'); if(!fs.existsSync(tldsPath)) return res.status(404).json({ error:'Workshop not found' }); }
  try { const data = fs.readFileSync(tldsPath); const zip = await JSZip.loadAsync(data); const findFileBySuffix = suf => Object.values(zip.files).find(f=> f.name.toLowerCase().endsWith(suf.toLowerCase())) || null; const manifestFile = findFileBySuffix('manifest.json'); if(!manifestFile) return res.status(400).json({ error:'manifest.json not found in workshop archive' }); const manifest = JSON.parse(await manifestFile.async('string')); let indexHtml=''; const indexFile = findFileBySuffix('index.html'); if(indexFile) indexHtml = await indexFile.async('string'); res.json({ manifest, indexHtml, hasLogic: !!findFileBySuffix('logic.js'), hasStyle: !!findFileBySuffix('style.css') }); } catch(e){ res.status(500).json({ error:'Workshop load failed' }); }
});

router.get('/workshop_asset', async (req,res)=>{
  try { const lessonId = req.query.lesson_id; const file = (req.query.file || '').toLowerCase(); if(!lessonId || !file) return res.status(400).send('Missing lesson_id or file'); let tldsPath = path.join(EXAMPLES_ROOT, lessonId + '.tlds'); if(!fs.existsSync(tldsPath)) { tldsPath = path.join(EXAMPLES_ROOT, 'Topics', lessonId.replace(/^Topics\//,'') + '.tlds'); if(!fs.existsSync(tldsPath)) return res.status(404).send('Not found'); } const data = fs.readFileSync(tldsPath); const zip = await JSZip.loadAsync(data); const target = Object.values(zip.files).find(f=> f.name.toLowerCase().endsWith(file)); if(!target) return res.status(404).send('Not found'); const content = await target.async('string'); if(file.endsWith('.css')) res.type('text/css'); else if(file.endsWith('.js')) res.type('application/javascript'); else res.type('text/plain'); res.send(content); } catch(e){ res.status(500).send('Asset error'); }
});

module.exports = router;
