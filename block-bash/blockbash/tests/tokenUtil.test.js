const util = require('../backend/security/pasetoUtil');

describe('token util', () => {
// Updated tests for real PASETO v2.public util.
const util = require('../backend/security/pasetoUtil');

describe('pasetoUtil', () => {
  test('sign & verify access token', async () => {
    const token = await util.sign({ sub: 'user1', name: 'User One' }, { ttlSeconds: 5 });
    const payload = await util.verify(token);
    expect(payload.sub).toBe('user1');
    expect(payload.exp).toBeDefined();
  });

  test('expires properly', async () => {
    const token = await util.sign({ sub: 'u2' }, { ttlSeconds: 1 });
    await new Promise(r => setTimeout(r, 1100));
    await expect(util.verify(token)).rejects.toThrow(/token_expired/);
  });

  test('refresh token kind flag', async () => {
    const rt = await util.signRefresh({ sub: 'u3' }, { ttlSeconds: 5 });
    const payload = await util.verify(rt);
    expect(payload.kind).toBe('refresh');
  });

  test('tampered token fails', async () => {
    const token = await util.sign({ sub: 'u4' }, { ttlSeconds: 30 });
    // PASETO tokens are versioned; attempt trivial tamper by flipping a char
    const tampered = token.slice(0, -2) + (token.slice(-2,-1) === 'A' ? 'B' : 'A') + token.slice(-1);
    await expect(util.verify(tampered)).rejects.toThrow();
  });
});
});