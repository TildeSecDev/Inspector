const supertest = require('supertest');
function api(){
  if(!global.__BASE_URL__) throw new Error('BASE_URL not set');
  return supertest(global.__BASE_URL__);
}
module.exports = { api };
