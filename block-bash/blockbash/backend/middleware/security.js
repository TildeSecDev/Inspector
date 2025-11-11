// Re-export banned commands helper + extendable security utilities
const { isBanned } = require('../security/bannedCommands');

module.exports = { isBanned };
