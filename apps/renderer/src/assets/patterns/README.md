# Patterns

Background patterns, textures, and geometric shapes for visual polish.

## Usage

Import patterns in components or reference as CSS backgrounds:

```tsx
import gridPattern from '@/assets/patterns/grid.svg';

function HeroSection() {
  return (
    <div 
      className="relative"
      style={{ backgroundImage: `url(${gridPattern})` }}
    >
      <h1>Welcome to Inspector Twin</h1>
    </div>
  );
}
```

Or use in CSS:

```css
.hero-section {
  background-image: url('@/assets/patterns/grid.svg');
  background-size: 40px 40px;
  background-repeat: repeat;
}
```

## Pattern Types

### Backgrounds (`backgrounds/`)
Subtle textures for cards, sections, and hero areas:
- `grid.svg` - Dotted or line grid (designer canvas background)
- `noise.svg` - Subtle noise texture for depth
- `gradient-mesh.svg` - Soft gradient background
- `geometric.svg` - Abstract geometric shapes

### Borders/Dividers (`dividers/`)
Decorative separators:
- `wave-divider.svg` - Wavy section separator
- `dotted-line.svg` - Dotted horizontal line
- `gradient-line.svg` - Gradient accent line

### Accents (`accents/`)
Small decorative elements:
- `corner-accent.svg` - Corner decoration for cards
- `blob-shape.svg` - Abstract blob backgrounds
- `circuit-pattern.svg` - Tech-themed circuit board pattern

## Guidelines

- **Format**: SVG only for patterns (scalable and lightweight)
- **Opacity**: Keep patterns subtle (10–20% opacity) to avoid overwhelming content
- **Colors**: Use neutral tones or brand accent colors
- **Tiling**: Ensure seamless tiling for repeating patterns
- **Size**: Small file sizes (<10KB); optimize aggressively
- **Performance**: Test pattern performance on low-end devices; avoid complex gradients
- **Dark mode**: Provide `-dark` variants or use CSS filters to invert
