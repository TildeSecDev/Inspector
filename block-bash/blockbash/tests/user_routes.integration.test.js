const { api } = require('./util/supertestAgent');

function ru(){ return 'usr_'+Math.random().toString(36).slice(2,8); }

describe('User routes basic', () => {
  test('preferred_os unauthenticated denied then works after register/login', async () => {
    const prefDenied = await api().get('/user/preferred_os');
    expect(prefDenied.status).toBe(401);
    const name = ru(); const email = name+'@example.com'; const pw='Passw0rd!';
    await api().post('/auth/register').send({ name, email, password: pw });
    const login = await api().post('/auth/login').send({ email, password: pw });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const getOs = await api().get('/user/preferred_os').set('Cookie', cookie);
    expect(getOs.body).toHaveProperty('os');
  }, 12000);

  test('notifications list & delete safe path (empty list OK)', async () => {
    const name = ru(); const email = name+'@example.com'; const pw='Passw0rd!';
    await api().post('/auth/register').send({ name, email, password: pw });
    const login = await api().post('/auth/login').send({ email, password: pw });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const notes = await api().get('/user/notifications').set('Cookie', cookie);
    expect(Array.isArray(notes.body)).toBe(true);
    // delete index 0 on empty list returns error or ok depending on implementation; tolerate both
    const del = await api().post('/user/notifications/delete').set('Cookie', cookie).send({ idx:0 });
    expect([200,400,404]).toContain(del.status);
  }, 12000);
});
