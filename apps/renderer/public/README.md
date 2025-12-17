# Public Static Assets

Static assets that must keep their filename or be accessible via root-relative paths.

## Usage

Files in this directory are copied as-is to the build output root. Reference them with absolute paths:

```html
<link rel="icon" href="/favicon.svg" />
<img src="/logo.png" alt="Logo" />
```

## What Goes Here

- **Favicons**: `favicon.ico`, `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`
- **App manifests**: `manifest.json`, `robots.txt`, `sitemap.xml`
- **Assets with fixed URLs**: Files that must be accessed via a specific URL path
- **Large files**: Assets too big for bundling that should be fetched on-demand

## What Doesn't Go Here

Avoid placing assets here if they can be imported in source files (logos, icons, images). Use `src/assets/` instead so Vite can:
- Hash filenames for cache-busting
- Optimize and compress images
- Tree-shake unused assets
- Inline small files as base64

## File Naming

Use lowercase with hyphens: `app-logo.svg`, `hero-background.jpg`
