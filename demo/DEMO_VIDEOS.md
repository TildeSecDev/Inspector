# Inspector Twin - Demo Videos

This directory contains demonstration videos showcasing the Inspector Twin application features and workflows.

## Main Demo Video

### `inspector-twin-demo.webm` (978 KB)
**Comprehensive Feature Showcase** - Complete walkthrough of all major features:

1. **Landing & ROE Acceptance** - App startup and rules of engagement
2. **Project Exploration** - Viewing existing sample projects
3. **Project Creation** - Creating a new security assessment project
4. **Twin Designer** 
   - Canvas interface for topology design
   - Multiple tabs (Designer, Scenarios, Simulation Runner, Findings)
   - Empty state for new projects
5. **Navigation** - Complete tour through all pages (Projects, Reports, Settings)

**Duration:** ~44 seconds  
**Resolution:** 1920x1080 (Full HD)

---

## Additional Demo Videos

### `demo-happy-flow.webm` (827 KB)
Basic happy path workflow showing:
- Project creation from scratch
- Navigation through main interface
- Twin Designer basics

### `demo-sample-data.webm` (608 KB)
Demonstration using pre-loaded sample data:
- "SME Office + Cloud App" project
- Pre-configured network topology
- Scenario cards with security assessments
- All Twin Designer tabs with content

---

## Technical Details

**Recording Method:** Playwright automated browser testing  
**Browser:** Chromium  
**Format:** WebM  
**Slow Motion:** 100ms delays for clarity  

## Viewing Videos

These `.webm` files can be viewed in:
- Modern web browsers (Chrome, Firefox, Edge)
- VLC Media Player
- QuickTime Player (macOS with plugin)
- Any media player supporting WebM/VP9 codec

## Regenerating Videos

To create new demo videos:

```bash
# Start the dev server
npm run dev:tauri

# In another terminal, run the demo tests
npx playwright test --config=playwright-demo.config.ts
```

Videos will be saved in `test-results/` directories and can be copied to the root for easy access.

---

**Last Updated:** December 16, 2025  
**Application Version:** Inspector Twin 0.1.0
