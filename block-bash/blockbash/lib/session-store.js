// lib/session-store.js
// In-memory session store; replace with Redis/Postgres later
const sessions = new Map(); // userId -> { sessionId, os, containerId, createdAt, expiresAt }

const SESSION_TTL_MIN = parseInt(process.env.SESSION_TTL_MIN || '20', 10);

function createSession(userId, os, containerId) {
  const sessionId = Math.random().toString(36).substr(2, 9);
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_TTL_MIN * 60 * 1000;
  sessions.set(userId, { sessionId, os, containerId, createdAt, expiresAt });
  return sessionId;
}

function getSession(userId) {
  return sessions.get(userId);
}

function destroySession(userId) {
  sessions.delete(userId);
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [userId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      destroySession(userId);
      // TODO: Destroy container
    }
  }
}

setInterval(cleanupExpiredSessions, 60 * 1000).unref();

module.exports = { createSession, getSession, destroySession };
