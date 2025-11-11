const { api } = require('./util/supertestAgent');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function randomUser(){ return 'pwuser_'+Math.random().toString(36).slice(2,8); }

function getDb(){
  const dbPath = path.join(__dirname, '..', 'backend', 'databases', 'database.sqlite');
  return new sqlite3.Database(dbPath);
}

describe('Password reset flow', () => {
  test('request and reset password', async () => {
    const username = randomUser();
    const email = username+'@example.com';
    const origPass = 'OrigPass1!';
    const newPass = 'NewPass2!';

  const reg = await api()
      .post('/auth/register')
      .send({ name: username, email, password: origPass });
    expect(reg.body).toHaveProperty('success', true);

  const reqReset = await api()
      .post('/auth/request_password_reset')
      .send({ email });
    expect(reqReset.body).toHaveProperty('success', true);

    // Fetch token from DB
    const db = getDb();
    const token = await new Promise((resolve,reject)=>{
      db.get('SELECT token FROM password_resets WHERE email = ? ORDER BY id DESC LIMIT 1', [email], (err,row)=>{
        if (err) return reject(err);
        resolve(row && row.token);
      });
    });
    expect(token).toBeTruthy();

  const reset = await api()
      .post('/auth/reset_password')
      .send({ token, password: newPass });
    expect(reset.body).toHaveProperty('success', true);

    // Login with new password
  const loginNew = await api()
      .post('/auth/login')
      .send({ email, password: newPass });
    expect(loginNew.body).toHaveProperty('success', true);
  }, 25000);
});
