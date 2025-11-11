const { api } = require('./util/supertestAgent');

function randomUser(){ return 'adminu_'+Math.random().toString(36).slice(2,8); }

describe('Admin guard', () => {
  test('non-admin cannot access /admin/users', async () => {
    const username = randomUser();
    const email = username+'@example.com';
    const password = 'Passw0rd!';

  const base = 'http://localhost:'+process.env.PORT;
  await api()
      .post('/auth/register')
      .send({ name: username, email, password });

  const login = await api()
      .post('/auth/login')
      .send({ email, password });
    expect(login.body).toHaveProperty('success', true);

    // Extract cookie
    const cookie = login.headers['set-cookie'][0].split(';')[0];

  const adminUsers = await api()
      .get('/admin/users')
      .set('Cookie', cookie);
    expect(adminUsers.status).toBe(403); // not_authorised
  }, 15000);
});
