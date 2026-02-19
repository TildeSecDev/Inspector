# Frontend Implementation Guide

Quick reference for developers implementing the frontend UI components.

## TypeScript/React Component Structure

### Top Level Components

```
App/
├── TopoBuilder (main container)
│   ├── Header (project title, save/load)
│   ├── Canvas (drag-drop device placement)
│   ├── DevicePalette (device selection)
│   ├── PropertiesPanel (device configuration)
│   ├── LinkEditor (connection management)
│   ├── BottomPanel (console, logs, properties)
│   └── BuildControls (build, status, stop buttons)
```

### Data Flow

```
Redux/Context Store:
├── topology
│   ├── name
│   ├── description
│   ├── nodes[]
│   └── links[]
├── ui
│   ├── selectedNode
│   ├── selectedLink
│   ├── isDragging
│   └── connectMode
├── build
│   ├── buildId
│   ├── status
│   ├── progress
│   └── containers[]
└── validation
    ├── isValid
    └── errors[]
```

## Key Implementation Steps

### 1. Canvas Component

```typescript
interface CanvasProps {
  topology: Topology;
  selectedNode?: string;
  selectedLink?: string;
  onNodeSelect: (nodeId: string) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeDouble: (nodeId: string) => void;
  onLinkCreate: (source: Endpoint, target: Endpoint) => void;
}

export const Canvas = (props: CanvasProps) => {
  // Render nodes as draggable elements
  // Render links as SVG lines/paths
  // Handle drag events
  // Handle click/double-click
  // Handle connection mode
}
```

**Features:**
- Drag node positioning
- Visual node representation (colored circles with labels)
- SVG links between nodes
- Click to select
- Double-click to edit
- Right-click context menu

### 2. Device Palette Component

```typescript
interface DevicePaletteProps {
  devices: Device[];
  onDragStart: (device: Device) => void;
}

export const DevicePalette = (props: DevicePaletteProps) => {
  return (
    <div className="palette">
      {['router', 'server', 'client', 'attacker', 'network'].map(category => (
        <Category key={category} name={category}>
          {devices
            .filter(d => d.ui.category === category)
            .map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                onDragStart={props.onDragStart}
              />
            ))}
        </Category>
      ))}
    </div>
  )
}
```

**Features:**
- Organized by category
- Color-coded icons
- Drag to canvas
- Tooltip with description

### 3. Properties Panel Component

```typescript
interface PropertiesPanelProps {
  node?: Node;
  onChange: (node: Node) => void;
  errors?: string[];
}

export const PropertiesPanel = (props: PropertiesPanelProps) => {
  if (!props.node) return <NoSelection />;

  return (
    <div className="properties">
      <h3>{props.node.name}</h3>
      {props.node.configurableFields.map(field => (
        <PropertyField
          key={field}
          field={field}
          value={props.node.properties[field]}
          onChange={(value) => updateProperty(field, value)}
          errors={props.errors?.filter(e => e.includes(field))}
        />
      ))}
    </div>
  )
}
```

**Property Field Types:**
- **Simple fields:** name, image (text input)
- **Array fields:** exec, binds (add/remove items)
- **Object fields:** env (key-value editor)
- **IP fields:** IP, GW (with validation)

Example env editor:
```typescript
const EnvEditor = ({ env, onChange }) => {
  return (
    <div>
      {Object.entries(env).map(([key, value]) => (
        <div key={key}>
          <input value={key} onChange={(e) => updateKey(key, e.target.value)} />
          <input value={value} onChange={(e) => updateValue(key, e.target.value)} />
          <button onClick={() => removeKey(key)}>×</button>
        </div>
      ))}
      <button onClick={() => addKey()}>+ Add Env Var</button>
    </div>
  )
}
```

### 4. Link Editor Component

```typescript
interface LinkEditorProps {
  topology: Topology;
  onCreate: (link: Link) => void;
  onDelete: (linkId: string) => void;
  onUpdate: (link: Link) => void;
}

export const LinkEditor = (props: LinkEditorProps) => {
  // Mode 1: Connection mode (click two devices)
  // Mode 2: Edit existing link properties
  
  return (
    <div>
      <button onClick={toggleConnectionMode}>
        {isConnecting ? 'Cancel' : 'Create Link'}
      </button>
      {props.topology.links.map(link => (
        <LinkItem
          key={link.id}
          link={link}
          onDelete={() => props.onDelete(link.id)}
        />
      ))}
    </div>
  )
}
```

**Connection Mode:**
1. Click "Create Link"
2. Click on source device
3. Select source interface
4. Click on target device
5. Select target interface
6. Link created

### 5. Build Controls Component

```typescript
interface BuildControlsProps {
  topology: Topology;
  isValid: boolean;
  buildStatus?: BuildStatus;
  onBuild: (topology: Topology) => void;
  onStatus: (buildId: string) => void;
  onStop: (buildId: string) => void;
}

export const BuildControls = (props: BuildControlsProps) => {
  const [progress, setProgress] = useState(0);
  
  const handleBuild = async () => {
    try {
      const yaml = topologyToYaml(props.topology);
      const response = await fetch('/api/topology/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: props.topology.name,
          yamlContent: yaml,
        }),
      });
      
      const { buildId } = await response.json();
      await monitorBuild(buildId);
    } catch (error) {
      showError(error.message);
    }
  };

  const monitorBuild = (buildId: string) => {
    const eventSource = new EventSource(
      `/api/topology/${buildId}/progress`
    );

    eventSource.addEventListener('node-create', (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
      showNotification(`${data.nodeName}: ${data.status}`);
    });

    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data);
      eventSource.close();
      if (data.status === 'success') {
        enableStatusButton(buildId);
        enableStopButton(buildId);
      } else {
        showError(data.error);
      }
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      eventSource.close();
      showError(data.error);
    });
  };

  return (
    <div className="build-controls">
      <button
        onClick={handleBuild}
        disabled={!props.isValid || props.buildStatus?.status === 'building'}
      >
        Build
      </button>
      
      {props.buildStatus?.status === 'building' && (
        <ProgressBar value={progress} />
      )}
      
      {props.buildStatus?.status === 'success' && (
        <>
          <button onClick={() => props.onStatus(props.buildStatus.buildId)}>
            Status
          </button>
          <button onClick={() => props.onStop(props.buildStatus.buildId)}>
            Stop
          </button>
        </>
      )}
    </div>
  )
}
```

### 6. Progress Display

```typescript
const ProgressBar = ({ value, status }) => (
  <div className="progress-container">
    <div className="progress-bar" style={{ width: `${value}%` }} />
    <span>{status.phase}: {value}%</span>
    
    {status.currentNode && (
      <div className="current-step">
        {status.currentNode}: {status.message}
      </div>
    )}
  </div>
)
```

### 7. Device Loading

```typescript
const DevicePalette = () => {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const loadDevices = async () => {
      // Load all device templates from devices/
      const files = [
        'linux-alpine.json',
        'linux-netshoot.json',
        'linux-kali.json',
        'router-rare.json',
      ];

      const loadedDevices = await Promise.all(
        files.map(async (file) => {
          const response = await fetch(`/frontend/devices/${file}`);
          return response.json();
        })
      );

      setDevices(loadedDevices);
    };

    loadDevices();
  }, []);

  return <DevicePalette devices={devices} />;
};
```

## Component State Management

### Redux Store Shape

```typescript
interface AppState {
  topology: {
    name: string;
    description: string;
    nodes: Node[];
    links: Link[];
    metadata: {
      created: string;
      modified: string;
    };
  };
  ui: {
    selectedNodeId?: string;
    selectedLinkId?: string;
    isDragging: boolean;
    connectMode: boolean;
    connectSource?: EndPoint;
  };
  build: {
    buildId?: string;
    status: 'idle' | 'queued' | 'building' | 'success' | 'failed';
    progress: number;
    containers: Container[];
    error?: string;
  };
  validation: {
    errors: ValidationError[];
  };
}
```

### Redux Actions

```typescript
// Topology actions
dispatch(addNode(node));
dispatch(updateNode(nodeId, updates));
dispatch(deleteNode(nodeId));
dispatch(addLink(link));
dispatch(updateLink(linkId, updates));
dispatch(deleteLink(linkId));

// UI actions
dispatch(selectNode(nodeId));
dispatch(startDrag(nodeId));
dispatch(stopDrag());
dispatch(startConnect(source));
dispatch(cancelConnect());

// Build actions
dispatch(startBuild(topology));
dispatch(updateBuildProgress(percentage));
dispatch(completeBuild(buildId, status));
dispatch(stopBuild(buildId));

// Validation actions
dispatch(validateTopology(topology));
```

## Event Flow

### Node Creation
1. User drags device from palette
2. Canvas receives drop event
3. Store: `addNode(newNode)`
4. Re-render with new node
5. Optional: Validate topology

### Link Creation
1. User clicks "Create Link"
2. Store: `startConnect()`
3. User selects source device/interface
4. Store: `selectNode(sourceId)`
5. User selects target device/interface
6. Store: `addLink(link)`
7. Store: `cancelConnect()`
8. Re-render with new link

### Build Process
1. User clicks "Build" button
2. Store: `validateTopology()`
3. If invalid, show errors
4. If valid:
   - Store: `startBuild()`
   - Generate YAML
   - POST /api/topology/build
   - Receive buildId
   - Open EventSource stream
   - Store: `updateBuildProgress()` for each event
   - On complete: Store: `completeBuild()`
   - Enable status/stop buttons

## Styling Guidelines

### CSS Classes

```css
/* Canvas */
.canvas-container { }
.canvas-node { }
.canvas-node.selected { }
.canvas-node.dragging { }
.canvas-link { }
.canvas-link.selected { }

/* Palette */
.device-palette { }
.palette-category { }
.device-card { }
.device-icon { }

/* Properties */
.properties-panel { }
.property-field { }
.property-field.error { }
.property-array-editor { }
.property-object-editor { }

/* Build Controls */
.build-controls { }
.progress-bar { }
.progress-container { }
.button-group { }

/* Status */
.status-display { }
.container-list { }
.container-item { }
```

### Colors

```css
/* Device category colors */
--color-router: #06b6d4;
--color-server: #10b981;
--color-client: #3b82f6;
--color-attacker: #ef4444;
--color-network: #8b5cf6;

/* Status colors */
--color-success: #10b981;
--color-error: #ef4444;
--color-warning: #f59e0b;
--color-info: #3b82f6;
```

## Form Validation

### Real-time Validation

```typescript
const validateNode = (node: Node): string[] => {
  const errors: string[] = [];

  if (!node.name) errors.push('Node name is required');
  if (!/^[a-zA-Z0-9_-]+$/.test(node.name)) {
    errors.push('Node name must be alphanumeric');
  }

  if (node.properties.IP && !isValidCIDR(node.properties.IP)) {
    errors.push('Invalid CIDR notation for IP');
  }

  if (node.properties.GW && !isValidIP(node.properties.GW)) {
    errors.push('Invalid IP for gateway');
  }

  return errors;
};
```

## Testing Guidelines

### Unit Tests

```typescript
describe('topology-utils', () => {
  it('converts topology to YAML', () => {
    const topology = { /* ... */ };
    const yaml = topologyToYaml(topology);
    expect(yaml).toContain('name: ');
    expect(yaml).toContain('topology:');
  });

  it('validates topology correctly', () => {
    const result = validateTopology(validTopology);
    expect(result.valid).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('BuildControls', () => {
  it('submits topology on build', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        json: () => ({ buildId: 'test-123' }),
      })
    );

    render(<BuildControls topology={topology} />);
    fireEvent.click(screen.getByText('Build'));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/topology/build',
      expect.any(Object)
    );
  });
});
```

## Performance Optimization

- Memoize Canvas component (heavy rendering)
- Use virtual scrolling for device palette
- Debounce property field updates
- Lazy load device templates
- Cache YAML generation results

## Accessibility

- Keyboard navigation (arrow keys, enter)
- Screen reader support for canvas
- ARIA labels for buttons
- Color contrast compliance
- Focus management

