const fs = require('fs');
const path = require('path');

let temporaryDatabase = {
  "127.0.0.1": {
    display: "HELLO WORLD",
    name: "Development Team",
    email: "test@localhost.com",
    expires: -1,
    restricted: false,

  }
}

function getRandomUsername() {
  const nouns = ['bug', 'code', 'variable', 'function', 'array', 'loop', 'bit', 'byte'];
  const adjectives = ['fast', 'buggy', 'async', 'hacky', 'clean', 'smart', 'lazy', 'tiny'];
  const animals = ['cat', 'dog', 'fox', 'bear', 'wolf', 'eagle', 'lion', 'tiger', 'shark', 'whale'];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]; // corrected here
  return `${adjective}.${noun}.${animal}`;
}

function getIPAMDatabase() {
  return temporaryDatabase;
}

function checkClient(clientIP) {
  // check if IP exists in database and is not expired
  if (temporaryDatabase[clientIP]) {
    const ipData = temporaryDatabase[clientIP];
    if (ipData.expires <= Date.now() && ipData.expires !== -1) {
      delete temporaryDatabase[clientIP];
      return false; // IP expired, return false
    } else {
      return true; // IP is valid
    }
  }
  return false; // IP not found in database
}

function assignWorkspace(clientIP, name, email) {
  console.log(`Assigning workspace for IP: ${clientIP}, Name: ${name}`);
  const workspaceDir = path.join(__dirname, '..', '..', 'client_folders');
  // If an entry exists and is valid, use its display; otherwise, create new
  if (temporaryDatabase[clientIP]) {
    const ipData = temporaryDatabase[clientIP];
    if (ipData.expires <= Date.now() && ipData.expires !== -1) {
      delete temporaryDatabase[clientIP];
    } else {
      // Ensure workspace folder exists
      const userFolder = path.join(workspaceDir, ipData.display);
      if (!fs.existsSync(userFolder)) {
        fs.mkdirSync(userFolder, { recursive: true, mode: 0o700 });
      }
      return { displayName: ipData.display, workspaceDirectory: userFolder };
    }
  }
  // Create new assignment
  let username = getRandomUsername();
  while (Object.values(temporaryDatabase).some(entry => entry.display === username)) {
    username = getRandomUsername();
  }
  temporaryDatabase[clientIP] = {
    display: username,
    name: name,
    email: email,
    expires: Date.now() + 24 * 60 * 60 * 1000, // valid for 24 hours
    restricted: false,
  };
  const userFolder = path.join(workspaceDir, username);
  fs.mkdirSync(userFolder, { recursive: true, mode: 0o700 });
  return { displayName: username, workspaceDirectory: userFolder };
}

module.exports = {
  assignWorkspace,
  checkClient,
  getIPAMDatabase
}