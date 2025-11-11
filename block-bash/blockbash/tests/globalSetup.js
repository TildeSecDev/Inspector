const path = require('path');
module.exports = async () => {
  if (process.env.NO_GLOBAL_SERVER === '1') {
    return; // Skip starting shared server for isolated tests
  }
  process.env.NODE_ENV = 'test';
  process.env.SKIP_DOCKER = process.env.SKIP_DOCKER || '1';
  if (!process.env.PORT) process.env.PORT = '3900';
  // Use server entry (bin/www) to ensure full route + ws wiring for integration tests
  require(path.join(__dirname, '..', 'bin', 'www'));
  await new Promise(r => setTimeout(r, 300));
  global.__BASE_URL__ = 'http://localhost:' + process.env.PORT;
};
