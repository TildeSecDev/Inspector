# How `.TildeSec` Workshop Files Are Loaded and Used

## Current State: Loading from `/examples`

- `.TildeSec` files are stored as zip archives in `/examples/`.
- Backend endpoints (e.g., `/ws/workshop`, `/ws/workshop_asset`) read these files directly from disk.
- Example:  
  In `app.js`, see:
  ```js
  // app.js, line ~210 (as of June 2024)
  const TildeSecPath = path.join(__dirname, 'examples', lessonId + '.TildeSec');
  if (!fs.existsSync(TildeSecPath)) return res.status(404).json({ error: 'Workshop not found' });
  const data = fs.readFileSync(TildeSecPath);
  const zip = await JSZip.loadAsync(data);
  ```
- All asset and step loading is done from the unzipped archive in memory.

---

## Future State: Loading from SQLite Database

### 1. **Store `.TildeSec` Files in the Database**

- Use a table named `workshops` in `database.sqlite`:
  ```sql
  CREATE TABLE IF NOT EXISTS workshops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    data BLOB NOT NULL
  );
  ```
- Insert `.TildeSec` files as BLOBs:
  ```js
  // Example: insertFile('rpg', './examples/rpg.TildeSec')
  function insertFile(fileName, filePath) {
    // ...existing code...
    const query = 'INSERT INTO workshops (name, data) VALUES (?, ?)';
    sqliteDb.run(query, [fileName, data], ...);
    // ...existing code...
  }
  ```

### 2. **Modify Backend Endpoints**

#### `/ws/workshop` and `/ws/workshop_asset`

- **Old code** (reads from disk):
  ```js
  // app.js, /ws/workshop route
  const TildeSecPath = path.join(__dirname, 'examples', lessonId + '.TildeSec');
  if (!fs.existsSync(TildeSecPath)) return res.status(404).json({ error: 'Workshop not found' });
  const data = fs.readFileSync(TildeSecPath);
  const zip = await JSZip.loadAsync(data);
  ```
- **New code** (reads from DB):
  ```js
  // app.js, /ws/workshop route
  sqliteDb.get('SELECT data FROM workshops WHERE name = ?', [lessonId], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Workshop not found' });
    const zip = await JSZip.loadAsync(row.data);
    // ...rest of logic unchanged...
  });
  ```
- **Repeat this change for `/ws/workshop_asset` and any other endpoint that loads a .TildeSec.**

#### Example: `/ws/workshop_asset` (replace file read with DB query)
  ```js
  // Old:
  const TildeSecPath = path.join(__dirname, 'examples', lessonId + '.TildeSec');
  if (!fs.existsSync(TildeSecPath)) return res.status(404).send('Not found');
  const data = fs.readFileSync(TildeSecPath);
  const zip = await JSZip.loadAsync(data);

  // New:
  sqliteDb.get('SELECT data FROM workshops WHERE name = ?', [lessonId], async (err, row) => {
    if (err || !row) return res.status(404).send('Not found');
    const zip = await JSZip.loadAsync(row.data);
    // ...rest of logic unchanged...
  });
  ```

### 3. **Testing: How to Demo Database Loading**

#### a. **Insert a Demo `.TildeSec` File**
- Use a script or Node REPL to insert a `.TildeSec` file into the database:
  ```js
  // In app.js or a separate script
  insertFile('rpg', './examples/rpg.TildeSec');
  ```

#### b. **Modify Endpoints to Only Use Database**
- Temporarily comment out or remove all `fs.readFileSync` and `fs.existsSync` for `.TildeSec` files in `app.js`.
- Ensure all `/ws/workshop` and `/ws/workshop_asset` requests use the database query.

#### c. **Run the App and Test**
- Start the server.
- Visit `/editor` and ensure the RPG workshop loads as before.
- Try loading other workshops by changing `lesson_id` in the URL or via the UI.
- If the workshop loads and assets are served, the DB integration works.

#### d. **Debugging**
- If a workshop fails to load:
  - Check the `workshops` table in `database.sqlite` (use `sqlite3` CLI or DB Browser).
  - Ensure the `name` matches the `lesson_id` used in the request.
  - Check server logs for errors.

---

## Summary of Required Code Changes

- **Insert all `.TildeSec` files into the `workshops` table** as BLOBs, with `name` matching the lesson ID.
- **In `app.js`, replace all direct file reads of `.TildeSec` with SQLite queries** to fetch the BLOB.
- **Unzip and serve files from the BLOB as before.**
- **Test by removing the `/examples` files and confirming workshops still load.**

---

## Example: Minimal Patch for `/ws/workshop` in `app.js`

```js
// filepath: /Users/nathanbrown-bennett/block-bash/inspector/app.js
// ...existing code...
app.get('/ws/workshop', async (req, res) => {
  const lessonId = req.query.lesson_id;
  if (!lessonId) return res.status(400).json({ error: 'Missing lesson_id' });
  sqliteDb.get('SELECT data FROM workshops WHERE name = ?', [lessonId], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Workshop not found' });
    const zip = await JSZip.loadAsync(row.data);
    // ...rest of logic unchanged...
  });
});
// ...existing code...
```

---

## Migration Checklist

- [ ] Insert all `.TildeSec` files into the database.
- [ ] Update all backend endpoints to use the database, not the filesystem.
- [ ] Remove `.TildeSec` files from `/examples` to confirm DB-only loading.
- [ ] Test all workshop loading and asset serving.
- [ ] Document the migration and update deployment scripts.

