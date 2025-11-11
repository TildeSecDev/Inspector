// Optional global teardown for Playwright (not wired yet)
// Could terminate spawned server if we decide to manage it explicitly.
export default async function globalTeardown() {
  const pid = process.env.BLOCKBASH_PLAYWRIGHT_PID;
  if (pid) {
    try {
      process.kill(parseInt(pid, 10));
      console.log('[pw global-teardown] Killed server pid', pid);
    } catch (e) {
      console.warn('[pw global-teardown] Failed to kill pid', pid, e.message);
    }
  }
}