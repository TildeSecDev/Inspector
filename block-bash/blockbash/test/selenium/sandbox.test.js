const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');

async function testSandboxUI() {
  const service = new chrome.ServiceBuilder(chromedriver.path).build();
  const options = new chrome.Options()
    .addArguments(
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1366,768'
    );
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeService(service)
    .setChromeOptions(options)
    .build();
  try {
    await driver.get('http://localhost:3002/editor');
    await driver.findElement(By.id('username')).sendKeys('testuser');
    await driver.findElement(By.id('login')).click();
    await driver.wait(until.elementLocated(By.id('terminal')), 10000);
    console.log('Terminal loaded successfully');
  } finally {
    await driver.quit();
  }
}

testSandboxUI();
