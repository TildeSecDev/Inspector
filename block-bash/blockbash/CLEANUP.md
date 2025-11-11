Directory cleanup proposal (incremental)
======================================

Goals:
1. Reduce root clutter.
2. Group runtime code under `backend/` & `frontend/` (or `client/`).
3. Isolate one-off scripts & experimental artifacts.
4. Clarify legacy vs active entry points.

Proposed target layout (phase 1):

  backend/                # Server, routes, middleware, containers
  frontend/               # (If/when React or UI build tooling)
  scripts/                # Operational scripts (migrate, seed, docker helpers)
  tests/                  # Jest integration tests only
  e2e/                    # Selenium / Playwright / Postman collections (move from misc/test,...)
  docs/                   # Documentation & summaries
  assets/                 # Images & loose static assets currently at root
  legacy/                 # Archived root artifacts not yet deleted

Phase 1 Moves (safe, no code changes required):
- Move: `IMG_6948.png` -> `assets/IMG_6948.png`
- Move: `terminal-*.png` -> `assets/`
- Move: `general_with_default.css` -> `assets/` (unless actively imported by server; verify reference)
- Move: `debug_*.html` & `menu_test.html` -> `legacy/` (or `e2e/fixtures/` if still used)
- Move: `debug_inject.js`, `debug_test.js` -> `legacy/` unless imported.
- Move: `move_to_nested_structure.sh` -> `scripts/`
- Move: `generate_database_sql.js` -> `scripts/`
- Move: `clean_themes.py` -> `scripts/` (rename if kept)
- Move: `start_mongo.sh` -> `scripts/`
- Move: `app.js` (root legacy) -> `legacy/root_app.js` (already superseded by `bin/www` + `backend/server/app.js`)
- Move: `changes.txt`, `nextsteps*.txt`, `RPG_FIXES_SUMMARY.md` -> `docs/` (or merge content)

Phase 2 (after verifying references):
- Relocate `test_*.js` root files into `tests/` or `e2e/` with consistent naming (`*.spec.js` or `*.e2e.test.js`).
- Consolidate `misc/test/selenium` & `misc/test/playwright` into `e2e/selenium` and `e2e/playwright`.
- Move Postman collection(s) into `e2e/postman/` or keep under `test/postman/` but not both.

Phase 3 (refactors / deletions):
- Delete obsolete legacy scripts after 30 days without reference (track via git blame).
- Introduce lint rule or CI check forbidding new files at repo root except approved list (README.md, package.json, docker-compose.yml, LICENSE, .env.example).

Automation idea:
- Add npm script `repo:tidy` running a small Node script that warns about disallowed root patterns.

Next immediate step suggestion:
1. Create `assets/`, `legacy/`, and move only images + clearly unused debug HTML first.
2. Run all tests; if stable, proceed with script relocation.

This document serves as a checklist; strike items as completed in PR descriptions.
