const { api } = require('./util/supertestAgent');

function randomUser(){ return 'prog_'+Math.random().toString(36).slice(2,8); }

describe('Progress route', () => {
  test('update and fetch progress', async () => {
    const username = randomUser();
    const email = username+'@example.com';
    const password = 'Passw0rd!';

    // Register
  const reg = await api()
      .post('/auth/register')
      .send({ name: username, email, password });
    expect(reg.body).toHaveProperty('success', true);
    const userId = reg.body.userId;

    // Update progress
  const update = await api()
      .post('/ws/progress')
      .send({ userId, lesson1: { complete: true }, achievements: ['skillA'] });
    expect(update.body).toHaveProperty('ok', true);

    // Fetch progress
  const get = await api()
      .post('/ws/progress')
      .send({ userId, get: true });
    expect(get.body).toHaveProperty('progress');
  }, 15000);
});
