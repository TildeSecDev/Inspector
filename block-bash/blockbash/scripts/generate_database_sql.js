const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the databases folder exists
const dbFolder = path.join(__dirname, 'databases');
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
  console.log(`Created databases directory at ${dbFolder}`);
}

// Define database file path
const dbPath = path.join(dbFolder, 'database.sqlite');

// Open (or create) the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// SQL statements to create tables
const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    userType TEXT DEFAULT 'student',
    organisation TEXT DEFAULT '',
    progress TEXT DEFAULT '{}',         -- JSON string for user progress
    achievements TEXT DEFAULT '[]'      -- JSON string for user achievements
  );
`;

const createUserProgressesTable = `
  CREATE TABLE IF NOT EXISTS userprogresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    password TEXT,
    email TEXT,
    ip TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    storyCompletions TEXT,
    taskCompletions TEXT,
    lastCommands TEXT,
    achievements TEXT,
    files TEXT,
    sudo INTEGER DEFAULT 0
  );
`;

const createWorkshopsTable = `
  CREATE TABLE IF NOT EXISTS workshops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workshopUrl TEXT NOT NULL
  );
`;

const createAchievementsTable = `
  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    step TEXT,
    svg TEXT
  );
`;

const insertAchievements = [
  // name, description, step, svg (svg is a filename or inline SVG string)
  ["First Steps", "Complete the first step in any story.", "step1", "first_steps.svg"],
  ["Linux Novice", "Complete the 'Awakening' story.", "awakening", "linux_novice.svg"],
  ["Network Detective", "Complete the 'Network Quest' story.", "network_quest", "network_detective.svg"],
  ["Egg Hunter", "Find the hidden egg.", "egg", "egg_hunter.svg"],
  ["Tree Climber", "Complete the 'tree' task.", "tree", "tree_climber.svg"],
  ["Speedrunner", "Finish any story in under 5 minutes.", "speedrun", "speedrunner.svg"],
  ["Mira's Friend", "Complete Mira's story.", "mira", "mira_friend.svg"],
  ["Skill Tree Unlocked", "Open the skill tree.", "skill_tree", "skill_tree.svg"],
  ["Sandbox Explorer", "Use sandbox mode.", "sandbox", "sandbox_explorer.svg"],
  ["Terminal Master", "Run 10 commands in the terminal.", "terminal", "terminal_master.svg"],
  ["Inspector Pro", "Complete all stories.", "all_stories", "block_bash_pro.svg"]
];

// Execute table creation commands sequentially
db.serialize(() => {
  db.run(createUsersTable, (err) => {
    if (err) console.error('Error creating users table:', err.message);
    else console.log('Users table created or already exists.');
  });
  
  db.run(createUserProgressesTable, (err) => {
    if (err) console.error('Error creating userprogresses table:', err.message);
    else console.log('UserProgresses table created or already exists.');
  });
  
  db.run(createWorkshopsTable, (err) => {
    if (err) console.error('Error creating workshops table:', err.message);
    else console.log('Workshops table created or already exists.');
  });

  db.run(createAchievementsTable, (err) => {
    if (err) console.error('Error creating achievements table:', err.message);
    else console.log('Achievements table created or already exists.');
  });

  // Insert achievements
  const stmt = db.prepare("INSERT OR IGNORE INTO achievements (name, description, step, svg) VALUES (?, ?, ?, ?)");
  insertAchievements.forEach(([name, desc, step, svg]) => {
    stmt.run(name, desc, step, svg);
  });
  stmt.finalize();
});

// Close the database connection
db.close((err) => {
  if (err) console.error('Error closing database:', err.message);
  else console.log('Closed the SQLite database connection.');
});
