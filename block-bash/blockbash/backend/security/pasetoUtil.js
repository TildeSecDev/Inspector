// backend/security/pasetoUtil.js
// Minimal PASETO v2 local token helper. Requires 'paseto' package.
// Real PASETO (v2.public) implementation with persistent secret key
let V2; try { ({ V2 } = require('paseto')); } catch { V2 = null; }
const fs = require('fs');
const path = require('path');
const KEY_DIR = path.join(__dirname,'keys');
const SECRET_FILE = path.join(KEY_DIR,'v2-public-secret.b64');
let secretKeyObj=null;

function ensureDir(){ try{ fs.mkdirSync(KEY_DIR,{recursive:true}); }catch{} }
function now(){ return Math.floor(Date.now()/1000); }

async function loadSecret(){
  if(secretKeyObj) return secretKeyObj;
  if(!V2 || !V2.generateKey) throw new Error('paseto_unavailable');
  ensureDir();
  if(fs.existsSync(SECRET_FILE)){
    try {
      const raw = fs.readFileSync(SECRET_FILE,'utf8').trim();
      const bytes = Buffer.from(raw,'base64');
      if(bytes.length && V2.bytesToKeyObject) secretKeyObj = V2.bytesToKeyObject(bytes);
    } catch(e){ console.warn('[pasetoUtil] load secret failed', e.message); }
  }
  if(!secretKeyObj){
    secretKeyObj = await V2.generateKey('public');
    try { if(V2.keyObjectToBytes){ fs.writeFileSync(SECRET_FILE, V2.keyObjectToBytes(secretKeyObj).toString('base64')); } } catch(e){ console.warn('[pasetoUtil] persist secret failed', e.message); }
  }
  return secretKeyObj;
}

async function sign(payload, opts={}){
  const ttl = opts.ttlSeconds || 60*15;
  const exp = now()+ttl;
  const full = { ...payload, iat:new Date().toISOString(), exp:new Date(exp*1000).toISOString() };
  const sk = await loadSecret();
  return V2.sign(full, sk);
}
async function signRefresh(payload, opts={}){ return sign({ ...payload, kind:'refresh' }, { ttlSeconds: opts.ttlSeconds || 60*60*24*7 }); }
async function verify(token){
  const sk = await loadSecret();
  const payload = await V2.verify(token, sk);
  if(payload.exp){ const ts = Date.parse(payload.exp)/1000; if(ts && now()>ts) throw new Error('token_expired'); }
  return payload;
}

module.exports = { sign, signRefresh, verify };
