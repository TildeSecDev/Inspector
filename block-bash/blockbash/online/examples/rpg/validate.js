/*
function validate({ command, commandOutput }) {
  console.log(`validating command: ${command}`);
  if (typeof command === 'string' && command.trim() === 'ls') {
    console.log(`validation passed: user ran ${command}`);
    return { pass: true, menu: ['Start', 'Options', 'Progress'] };
  }
  console.log(`validation incomplete: user ran ${command}, expecting 'ls'`);
  return { pass: false, hint: "Try typing 'ls' in the terminal." };
}
*/

// Only export the always-pass function
// module.exports = function({command, commandOutput}) {
//   return { pass: true, hint: 'Always passes for test.' };
// };

function normalizeCommand(cmd) {
  if (typeof cmd !== 'string') return '';
  // Remove all whitespace and non-alpha chars, lowercase
  return cmd.replace(/[^a-z]/gi, '').toLowerCase();
}

// --- RPG Validation Module ---
// CommonJS export for server-side use
function validate({ command, commandOutput }) {
  // Normalize and trim the command
  const trimmedCommand = (command || '').trim();
  
  // Example validation: only 'ls' passes
  if (trimmedCommand === 'ls') {
    return { pass: true, menu: ['Start', 'Options', 'Progress'] };
  }
  return { pass: false, hint: "Try typing 'ls' in the terminal." };
}

module.exports = validate;
