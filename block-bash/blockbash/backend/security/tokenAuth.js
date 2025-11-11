// Token authentication middleware (HMAC or PASETO abstraction)
// Looks for token in Authorization: Bearer <token> or auth_token cookie
// Uses tokenUtil.verify to decode and attaches req.auth = { sub, name, admin }

let tokenUtil = null;
try { tokenUtil = require('./pasetoUtil'); } catch {}

function extractToken(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (auth && /^Bearer\s+/.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  if (req.cookies && req.cookies.auth_token) return req.cookies.auth_token;
  if (req.query && req.query.token) return req.query.token; // dev only
  return null;
}

async function tokenAuth(req, res, next) {
  if (!tokenUtil || typeof tokenUtil.verify !== 'function') {
    return res.status(500).json({ error: 'auth_unavailable' });
  }
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try {
  const payload = await tokenUtil.verify(token);
    req.auth = payload || {};
    if (req.auth && req.auth.sub === 'admin@example.com') req.auth.admin = true;
    if (req.requireAdmin && !req.auth.admin) return res.status(403).json({ error:'forbidden' });
    return next();
  } catch(e){
    return res.status(401).json({ error:'invalid_token', details:e.message });
  }
}

module.exports = tokenAuth;
