# Inspector — Electron wrapper for BlockBash

This repository now contains a standalone Electron app under the top level. The Electron UI is contained in `electron-app/` and does not use any resources from `block-bash/blockbash`.

How to run the standalone Electron app

1. Install the top-level dev dependencies (this will install Electron):

```bash
npm install
```

2. Start the desktop app:

```bash
npm start
```

What this standalone Electron app does

- Loads the static HTML/CSS/JS from `electron-app/` and opens it in a desktop BrowserWindow.
- It intentionally does not spawn or depend on the original BlockBash Express server.

Notes

- If you still want to run the original server, use the instructions in `block-bash/blockbash/README.md` — or run:

```bash
npm --prefix ./block-bash/blockbash install
npm --prefix ./block-bash/blockbash start
```

- For packaging into a native installer, I can add `electron-builder` configuration and a `build` script.
