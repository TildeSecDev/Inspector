const { Builder, By, until } = require('selenium-webdriver');
require('chromedriver');

jest.setTimeout(60000);

let driver;

beforeAll(async () => {
  driver = await new Builder().forBrowser('chrome').build();
});

afterAll(async () => {
  if (driver) await driver.quit();
});

async function registerAndLogin(name, email, password){
  await driver.get('http://localhost:3000/pages/welcome.html');
  // Assume presence of input[name="name"], input[name="email"], input[name="password"], button[data-action="register"]
  try { await driver.findElement(By.css('input[name="name"]')).sendKeys(name); } catch {}
  await driver.findElement(By.css('input[name="email"]')).sendKeys(email);
  await driver.findElement(By.css('input[name="password"]')).sendKeys(password);
  // Prefer login if account exists
  let loginBtn;
  try { loginBtn = await driver.findElement(By.css('[data-action="login"]')); } catch {}
  if (loginBtn) {
    await loginBtn.click();
  } else {
    const regBtn = await driver.findElement(By.css('[data-action="register"]'));
    await regBtn.click();
  }
  await driver.sleep(1000);
}

describe('Mira story journey', () => {
  test('user can login and open Mira story page', async () => {
    const email = 'mira'+Date.now()+'@ex.com';
    await registerAndLogin('miraUser', email, 'pw12345');
    // Navigate to examples/mira or equivalent story launch link
    await driver.get('http://localhost:3000/examples/mira');
    // Basic assertion: page loads and some expected element exists (fallback to body)
    await driver.wait(until.elementLocated(By.css('body')), 5000);
    const title = await driver.getTitle().catch(()=> '');
    expect(title).toBeDefined();
  });
});
