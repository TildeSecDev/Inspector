# Desktop Bundle Illustrations

Illustrations specific to the desktop application (about dialogs, update prompts, error screens).

## Usage

Load illustrations in the desktop main process or preload scripts:

```typescript
// In renderer with desktop-specific context
import aboutScreenIllustration from './assets/illustrations/about-screen.svg';

function AboutDialog() {
  return (
    <div>
      <img src={aboutScreenIllustration} alt="Inspector Twin" />
      <p>Version 1.0.0</p>
    </div>
  );
}
```

## Illustration Types

### System Dialogs (`dialogs/`)
Native-looking dialog visuals:
- `about-screen.svg` - About/version dialog illustration
- `update-available.svg` - Update notification dialog
- `first-launch.svg` - First launch welcome dialog
- `migration-progress.svg` - Data migration screen

### Installation/Setup (`setup/`)
Installation wizard and onboarding:
- `installation-complete.svg` - Successful installation
- `setup-wizard.svg` - Initial setup steps
- `import-data.svg` - Data import dialog

### Error Recovery (`errors/`)
Desktop-specific error states:
- `offline-mode.svg` - No internet connection
- `file-access-error.svg` - File system permission issue
- `crash-recovery.svg` - App crash recovery screen
- `database-error.svg` - Database corruption/recovery

## Guidelines

- **Format**: SVG preferred for scalability
- **Dimensions**: 300–400px width for dialog illustrations
- **Style**: Match the OS design language where possible
- **Colors**: Conservative palette; respect system theme
- **Simplicity**: Clear, simple visuals that work at various sizes
- **Localization**: Avoid text in illustrations (use captions instead)
- **File size**: Keep under 30KB per illustration
