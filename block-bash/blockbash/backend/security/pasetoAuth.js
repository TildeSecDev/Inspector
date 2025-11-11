// PASETO authentication middleware
// Looks for token in Authorization: Bearer <token> or auth_token cookie
// Uses pasetoUtil.verify to decode and attaches req.auth = { sub, name, iat }
// On failure responds 401 JSON. Lightweight; no role model yet.

let pasetoUtil = null;
try { pasetoUtil = require('./pasetoUtil'); } catch {}

function extractToken(req) {
  // Authorization header
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (auth && /^Bearer\s+/.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  // Cookie auth_token
  if (req.cookies && req.cookies.auth_token) return req.cookies.auth_token;
  // Query (for quick manual tests only – could be removed later)
  if (req.query && req.query.token) return req.query.token;
  return null;
}

async function pasetoAuth(req, res, next) {
  if (!pasetoUtil || typeof pasetoUtil.verify !== 'function') {
    return res.status(500).json({ error: 'auth_unavailable' });
  }
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try {
    const payload = await pasetoUtil.verify(token);
    req.auth = payload || {};
    // Fallback: treat seeded admin user as admin even if token missing claim
    if (req.auth && req.auth.sub === 'admin@example.com') {
      req.auth.admin = true;
    }
    // Basic admin claim check if route requested it
    if (req.requireAdmin && !req.auth.admin) {
      return res.status(403).json({ error: 'forbidden' });
    }
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token', details: e.message });
  }
}

module.exports = pasetoAuth;