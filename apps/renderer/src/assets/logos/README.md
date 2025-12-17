# Logos

Brand logos and wordmarks for the Inspector Twin application.

## Usage

Import logos in your components:

```tsx
import logoHorizontal from '@/assets/logos/inspector-logo-horizontal.svg';
import logoStacked from '@/assets/logos/inspector-logo-stacked.svg';
import logomark from '@/assets/logos/inspector-logomark.svg';

function Header() {
  return <img src={logoHorizontal} alt="Inspector Twin" className="h-8" />;
}
```

## Required Assets

- **`inspector-logo-horizontal.svg`** - Full logo with text, horizontal layout (header, documentation)
- **`inspector-logo-stacked.svg`** - Full logo with text, stacked layout (splash screens, mobile)
- **`inspector-logomark.svg`** - Icon-only version without text (sidebar collapsed, app icon overlays)
- **`inspector-wordmark.svg`** - Text-only version (minimal contexts)

Provide both SVG (preferred) and PNG (@1x, @2x, @3x) versions for each.

## Guidelines

- Use SVG format when possible for scalability
- Maintain consistent padding/spacing around logomark
- Dark mode: provide `-dark` suffix variants if needed
- Keep aspect ratios: horizontal ~4:1, stacked ~1:1.2, logomark 1:1
- Export with transparent backgrounds
