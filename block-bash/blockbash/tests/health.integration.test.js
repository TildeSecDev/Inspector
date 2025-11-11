const { api } = require('./util/supertestAgent');

// Simple readiness ping ensuring globalSetup server is alive and root path serves something.
describe('health readiness', () => {
  test('GET / responds 200/OK-ish', async () => {
    const res = await api().get('/');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(500);
    // Optionally check content-type or body fragment if stable
  });
});
