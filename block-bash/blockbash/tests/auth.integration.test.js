const { api } = require('./util/supertestAgent');

function randomUser(){ return 'testuser_'+Math.random().toString(36).slice(2,8); }

describe('Auth integration', () => {
  test('register then login', async () => {
    const username = randomUser();
    const email = username+'@example.com';
    const password = 'Passw0rd!';

  const reg = await api()
      .post('/auth/register')
      .send({ name: username, email, password });
    expect(reg.body).toHaveProperty('success', true);

  const login = await api()
      .post('/auth/login')
      .send({ email, password });
    expect(login.body).toHaveProperty('success', true);
    expect(login.body).toHaveProperty('username', username);
  }, 20000);
});
