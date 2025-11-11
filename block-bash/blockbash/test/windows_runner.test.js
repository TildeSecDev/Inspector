// Windows Runner integration smoke test
// Guarded: only runs if WIN_SSH_HOST & WIN_SSH_USER env vars are set and ssh2 module present.
// Purpose: ensure ensureUserContainer + execInUserContainer work with os='windows' path.

const assert = require('assert');
let manager;
try { manager = require('../backend/containers/manager'); } catch (e) {
  console.warn('[windows-runner-test] manager load failed:', e.message);
}

const hasEnv = process.env.WIN_SSH_HOST && process.env.WIN_SSH_USER && (process.env.WIN_SSH_PASS || process.env.WIN_SSH_KEY);

(hasEnv ? describe : describe.skip)('Windows SSH Runner', function() {
  this.timeout(15000);
  it('executes a simple PowerShell echo command', async () => {
    assert(manager, 'manager module not loaded');
    const user = 'win_test_user';
    const rec = await manager.ensureUserContainer(user, { os: 'windows' });
    assert(rec && (rec.kind === 'ssh-windows' || rec.kind === 'ssh'), 'expected ssh-windows or ssh record');
    const outputChunks = [];
    await new Promise((resolve, reject) => {
      manager.execInUserContainer(user, "Write-Output 'BLOCKBASH_WINDOWS_OK'", (d)=> outputChunks.push(d), (code)=> {
        try {
          assert.strictEqual(code, 0, 'exit code not 0');
          const output = outputChunks.join('');
            assert(/BLOCKBASH_WINDOWS_OK/.test(output), 'marker not found in output: '+ output);
          resolve();
        } catch (e) { reject(e); }
      }, 'windows');
    });
  });
});

if (!hasEnv) {
  console.log('[windows-runner-test] Skipped (set WIN_SSH_HOST, WIN_SSH_USER and WIN_SSH_PASS or WIN_SSH_KEY to enable)');
}
