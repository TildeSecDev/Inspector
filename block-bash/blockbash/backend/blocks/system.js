const shell = require('shelljs');

function executeSystemBlock(block) {
  switch (block.type) {
    case 'sys-reboot':
      // WARNING: This will reboot the server if run with sufficient privileges!
      return shell.exec('reboot');
    case 'sys-shutdown':
      // WARNING: This will shutdown the server if run with sufficient privileges!
      return shell.exec('shutdown now');
    case 'sys-useradd':
      if (block.inputs && block.inputs.username) {
        return shell.exec(`useradd ${shell.escape(block.inputs.username)}`);
      }
      break;
    case 'sys-chmod':
      if (block.inputs && block.inputs.target && block.inputs.mode) {
        return shell.exec(`chmod ${shell.escape(block.inputs.mode)} ${shell.escape(block.inputs.target)}`);
      }
      break;
    default:
      return { code: 1, stderr: 'Unknown system block type' };
  }
}

// Export for use in your block execution router/controller
module.exports = { executeSystemBlock };