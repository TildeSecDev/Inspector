const { isBanned } = require('../backend/security/bannedCommands');

describe('isBanned', () => {
  test('detects clearly banned destructive command', () => {
    expect(isBanned('rm -rf /')).toBe(true);
  });
  test('detects variant with extra whitespace', () => {
    expect(isBanned('   rm   -rf   /   ')).toBe(true);
  });
  test('detects uppercase variant', () => {
    expect(isBanned('RM -RF /')).toBe(true);
  });
  test('detects command with trailing semicolon', () => {
    expect(isBanned('rm -rf /; echo done')).toBe(true);
  });
  test('does not flag safe echo', () => {
    expect(isBanned('echo hello world')).toBe(false);
  });
  test('partial harmless substring should not trigger', () => {
    expect(isBanned('arm -r f /tmp')).toBe(false);
  });
});
