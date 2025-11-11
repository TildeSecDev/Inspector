// Basic banned command guard. Future: expand with AST/token classification and per-lab overrides.

const DEFAULT_BANNED = [
  'rm -rf /',
  'shutdown',
  'reboot',
  'mkfs',
  'dd if=',
  ':(){:|:&};:', // fork bomb
];

function normalize(cmd) {
  return cmd.trim().toLowerCase().replace(/\s+/g,' ');
}

function isBanned(raw) {
  const cmd = normalize(raw || '');
  return DEFAULT_BANNED.some(b => {
    const nb = normalize(b);
    return cmd.includes(nb);
  });
}

module.exports = { isBanned };
