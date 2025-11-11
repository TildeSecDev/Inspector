// backend/notifications/emailStub.js
// Simple logging stubs for future formsubmit.co integration.
async function sendUserSignup(email){ console.log('[EmailStub] signup ->', email); }
async function sendAdminNotice(subject, details){ console.log('[EmailStub] admin notice:', subject, details); }
async function sendLogin(email){ console.log('[EmailStub] login ->', email); }
module.exports = { sendUserSignup, sendAdminNotice, sendLogin };
