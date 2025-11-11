const { api } = require('./util/supertestAgent');

describe('Workshop route basics', () => {
  test('missing lesson_id yields client error (400/404)', async () => {
    const r = await api().get('/workshop');
    expect([400,404]).toContain(r.status);
  });
});
