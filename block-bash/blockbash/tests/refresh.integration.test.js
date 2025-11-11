const request = require('supertest');
let appInstance;

beforeAll(() => {
  process.env.NODE_ENV='test';
  appInstance = require('../backend/app');
});

afterAll(()=>{ /* no server to close */ });

function extractCookie(res, name){
  const raw = res.headers['set-cookie'] || [];
  const c = raw.find(c=>c.startsWith(name+'='));
  if(!c) return null;
  return c.split(';')[0].split('=')[1];
}

describe('auth refresh flow', () => {
  test('rotates refresh token and issues new access', async () => {
  const api = request(appInstance);
    const email = 'ruser'+Date.now()+'@ex.com';
    const password = 'pw12345';
    await api.post('/auth/register').send({ name:'refU', email, password });
    const login = await api.post('/auth/login').send({ email, password });
    expect(login.statusCode).toBe(200);
    const rt1 = extractCookie(login, 'refresh_token');
    const at1 = extractCookie(login, 'auth_token');
    expect(rt1).toBeTruthy();
    expect(at1).toBeTruthy();
    const refresh = await api.post('/auth/refresh').set('Cookie', [`refresh_token=${rt1}`]);
    expect(refresh.statusCode).toBe(200);
    const at2 = extractCookie(refresh, 'auth_token');
    const rt2 = extractCookie(refresh, 'refresh_token');
    expect(at2).toBeTruthy();
    expect(rt2).toBeTruthy();
    expect(at2).not.toEqual(at1);
    expect(rt2).not.toEqual(rt1);
    // Old refresh should now be invalid
    const refreshOld = await api.post('/auth/refresh').set('Cookie', [`refresh_token=${rt1}`]);
    expect(refreshOld.statusCode).toBe(401);
  });
});
