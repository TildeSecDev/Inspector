// Relocated server entry (formerly root app.js)
// Adjusted paths for new repo structure.

const path = require('path');
// Define root so relative resource paths remain stable
const ROOT = path.resolve(__dirname, '..', '..');
process.chdir(ROOT); // keep working directory stable for scripts relying on cwd

// Patch module paths requiring old relative './lib' etc. by constructing absolute requires
module.exports = require('../app');
