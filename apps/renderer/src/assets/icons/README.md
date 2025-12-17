# Icons

UI and domain-specific icons for the Inspector Twin application.

## Usage

Import icons in components:

```tsx
import routerIcon from '@/assets/icons/nodes/router.svg';
import serverIcon from '@/assets/icons/nodes/server.svg';
import warningIcon from '@/assets/icons/status/warning.svg';

function NetworkNode({ type }) {
  const icon = type === 'router' ? routerIcon : serverIcon;
  return <img src={icon} className="w-6 h-6" alt={type} />;
}
```

## Icon Categories

### Network/Node Icons (`nodes/`)
Infrastructure and device types for the twin designer:
- `router.svg`, `switch.svg`, `firewall.svg`
- `server.svg`, `database.svg`, `endpoint.svg`
- `cloud.svg`, `iot-device.svg`, `user.svg`
- `connector.svg`, `link.svg`

Provide both line (default) and filled (selected) states.

### Canvas Actions (`canvas/`)
Designer toolbar controls:
- `pan.svg`, `zoom-in.svg`, `zoom-out.svg`, `fit-to-screen.svg`
- `snap-to-grid.svg`, `align-left.svg`, `align-center.svg`
- `lock.svg`, `unlock.svg`, `visibility-on.svg`, `visibility-off.svg`
- `delete.svg`, `duplicate.svg`, `group.svg`, `ungroup.svg`

### Scenario Templates (`scenarios/`)
Attack/scenario visual identifiers:
- `phishing.svg`, `ransomware.svg`, `ddos.svg`
- `misconfiguration.svg`, `insider-threat.svg`, `supply-chain.svg`
- `credential-stuffing.svg`, `lateral-movement.svg`

### Simulation Metrics (`metrics/`)
Performance and impact indicators:
- `latency.svg`, `throughput.svg`, `error-rate.svg`
- `blast-radius.svg`, `cost.svg`, `impact.svg`

### Findings/Severity (`findings/`)
Security finding classifications:
- `critical.svg`, `high.svg`, `medium.svg`, `low.svg`, `info.svg`
- Category icons: `auth.svg`, `network.svg`, `data.svg`, `config.svg`, `identity.svg`

### Status/UI (`status/`)
General UI status indicators:
- `success.svg`, `warning.svg`, `error.svg`, `info.svg`
- `loading.svg`, `empty.svg`, `search.svg`, `filter.svg`

### Reports/Export (`reports/`)
Export and document icons:
- `pdf.svg`, `html.svg`, `csv.svg`, `json.svg`
- `download.svg`, `print.svg`, `share.svg`, `email.svg`

### Settings/System (`settings/`)
Configuration and system controls:
- `policy.svg`, `key.svg`, `lock.svg`, `shield.svg`
- `org.svg`, `user.svg`, `team.svg`, `role.svg`
- `s3.svg`, `azure-blob.svg`, `gcs.svg` (integrations)

## Guidelines

- **Format**: SVG preferred; 24×24px default viewBox
- **Stroke width**: 1.5–2px for consistency
- **Style**: Match design system (outline/filled)
- **Naming**: lowercase-with-hyphens.svg
- **Colors**: Single color (currentColor) for CSS control; multi-color only if brand-specific
- **Accessibility**: Include meaningful filenames; components should provide alt text
