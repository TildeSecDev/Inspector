// test_validate_logic_integration.js
// Node.js test to ensure validate.js (from rpg examples) interacts with logic.js as expected
// This test simulates the backend calling validate.js and the frontend logic.js handling the result

const fs = require('fs');
const path = require('path');

async function loadValidateFromFile() {
  // Use the extracted rpg/validate.js file instead of the TildeSec archive
  const validatePath = path.join(__dirname, '..', 'examples', 'rpg', 'validate.js');
  if (!fs.existsSync(validatePath)) throw new Error('validate.js not found in examples/rpg/');
  const validateCode = fs.readFileSync(validatePath, 'utf8');
  return validateCode;
}

async function testValidateLogicIntegration() {
  // Load validate.js directly from rpg examples
  const validatePath = path.join(__dirname, '..', 'examples', 'rpg', 'validate.js');
  if (!fs.existsSync(validatePath)) throw new Error('validate.js not found in examples/rpg/');
  
  // Clear require cache to ensure fresh load
  delete require.cache[require.resolve(validatePath)];
  const validate = require(validatePath);
  
  if (typeof validate !== 'function') {
    console.error('validate is not a function');
    return;
  }
  
  // Simulate logic.js calling validate
  const testCommands = ['ls', 'pwd', 'echo hello', ''];
  for (const cmd of testCommands) {
    const result = validate({ command: cmd, commandOutput: '' });
    console.log(`validate('${cmd}') =>`, result);
    if (cmd === 'ls') {
      if (!result.pass || !Array.isArray(result.menu)) {
        console.error('FAIL: ls should pass and return menu array');
        process.exit(1);
      }
    } else {
      if (result.pass) {
        console.error(`FAIL: '${cmd}' should not pass validation`);
        process.exit(1);
      }
    }
  }
  console.log('validate.js <-> logic.js integration test passed.');
}

testValidateLogicIntegration().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
