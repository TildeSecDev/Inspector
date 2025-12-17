# Desktop Bundle Icons

Icons specific to the Electron/Tauri desktop application (tray, notifications, system integration).

## Usage

Load icons in the desktop main process:

```typescript
// In main process (Electron/Tauri)
import path from 'path';

const trayIconPath = path.join(__dirname, 'assets', 'icons', 'tray-icon.png');
const tray = new Tray(trayIconPath);
```

## Required Icons

### System Tray (`tray/`)
Icons for the system tray/menu bar:
- `tray-icon.png` - Default tray icon (16×16 @1x, 32×32 @2x)
- `tray-icon-dark.png` - Dark mode variant (macOS)
- `tray-icon-inactive.png` - Inactive/disabled state
- `tray-icon-alert.png` - Alert/notification state

### Notifications (`notifications/`)
Icons for system notifications:
- `notification-default.png` - Generic notification (64×64)
- `notification-success.png` - Success notification
- `notification-warning.png` - Warning notification
- `notification-error.png` - Error notification

### Window Icons (`window/`)
Additional window-specific icons:
- `window-icon.png` - Taskbar/dock icon (256×256)

## Platform Requirements

### macOS
- **Tray**: 16×16 @1x, 32×32 @2x (Template images, black with alpha)
- **Dock**: 128×128, 256×256, 512×512, 1024×1024
- **Format**: PNG with transparency

### Windows
- **Tray**: 16×16, 32×32, 48×48
- **Taskbar**: 256×256
- **Format**: ICO (multi-resolution) or PNG

### Linux
- **Tray**: 22×22, 24×24, 32×32
- **App icon**: 16×16, 32×32, 48×48, 64×64, 128×128, 256×256, 512×512
- **Format**: PNG with transparency

## Guidelines

- Use PNG format with transparency
- macOS tray icons should be template images (monochrome, black with alpha channel)
- Provide @1x and @2x versions for Retina displays
- Keep designs simple and recognizable at small sizes
- Test visibility on both light and dark system themes
- File naming: `icon-name@2x.png` for high-DPI versions
