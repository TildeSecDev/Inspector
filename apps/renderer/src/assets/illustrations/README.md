# Illustrations

Spot illustrations and visual content for empty states, onboarding, and feature highlighting.

## Usage

Import illustrations in components:

```tsx
import emptyProjectsIllustration from '@/assets/illustrations/empty-projects.svg';

function EmptyState() {
  return (
    <div className="text-center">
      <img src={emptyProjectsIllustration} alt="" className="mx-auto h-48" />
      <p>No projects yet. Create your first project to get started.</p>
    </div>
  );
}
```

## Illustration Types

### Empty States (`empty-states/`)
Visual feedback when no data exists:
- `empty-projects.svg` - Projects page with no projects
- `empty-designer.svg` - Designer canvas with no topology
- `empty-scenarios.svg` - Scenarios page with no scenarios
- `empty-simulation.svg` - Simulation runner with no runs
- `empty-findings.svg` - Findings page with no findings
- `empty-reports.svg` - Reports page with no generated reports
- `empty-search.svg` - Search with no results

### Onboarding/Splash (`onboarding/`)
First-run experience and loading screens:
- `splash-screen.svg` - App loading/initialization
- `welcome.svg` - First launch welcome message
- `getting-started.svg` - Quick start guide illustration

### Feature Highlights (`features/`)
Visual aids for feature explanations:
- `twin-designer-hero.svg` - Designer feature showcase
- `simulation-runner-hero.svg` - Simulation feature showcase
- `findings-analysis-hero.svg` - Findings feature showcase
- `report-generation-hero.svg` - Report feature showcase

### Error States (`errors/`)
User-friendly error visualizations:
- `404.svg` - Page not found
- `500.svg` - Server error
- `network-error.svg` - Connection issues
- `permission-denied.svg` - Access denied

## Guidelines

- **Format**: SVG preferred; provide PNG fallback (@2x) for complex illustrations
- **Dimensions**: Max 600px width; maintain 4:3 or 16:9 aspect for consistency
- **Style**: Match brand visual language (colors, shapes, line style)
- **Color palette**: Use brand colors; max 3–4 colors per illustration
- **Simplicity**: Keep illustrations simple and recognizable at smaller sizes
- **Accessibility**: Decorative only; use `alt=""` or `role="presentation"`
- **File size**: Optimize SVGs (remove metadata, simplify paths); keep under 50KB each
