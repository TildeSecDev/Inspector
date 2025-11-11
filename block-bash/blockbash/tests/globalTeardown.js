// Global teardown to ensure containers / resources cleaned up after Jest
module.exports = async () => {
  try {
    const mgr = require('../backend/containers/manager');
    if (mgr && typeof mgr.disposeAll === 'function') {
      await mgr.disposeAll('jest-global-teardown');
    }
  } catch (e) {
    // swallow
  }
  // Close primary HTTP server if exposed
  try {
    if (global.__JEST_PRIMARY_SERVER__) {
      await new Promise(res => global.__JEST_PRIMARY_SERVER__.close(res));
      delete global.__JEST_PRIMARY_SERVER__;
    }
  } catch (_) {
    // ignore
  }
};
