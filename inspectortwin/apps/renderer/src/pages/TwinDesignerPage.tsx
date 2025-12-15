import { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '../store/appStore';
import { Save } from 'lucide-react';

const nodeTypes = [
  { type: 'router', label: 'Router', color: '#0066cc' },
  { type: 'switch', label: 'Switch', color: '#00aa66' },
  { type: 'firewall', label: 'Firewall', color: '#ff4444' },
  { type: 'server', label: 'Server', color: '#9966ff' },
  { type: 'workstation', label: 'Workstation', color: '#666666' },
  { type: 'cloud-service', label: 'Cloud', color: '#00ccff' },
];

export function TwinDesignerPage() {
  const { currentProject, currentTopology, setCurrentTopology } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeType, setSelectedNodeType] = useState(nodeTypes[0]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: `${selectedNodeType.label} ${nodes.length + 1}`,
        nodeType: selectedNodeType.type,
      },
      style: {
        backgroundColor: selectedNodeType.color,
        color: '#fff',
        padding: '10px',
        borderRadius: '8px',
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleSave = async () => {
    if (!window.electronAPI || !currentProject) return;

    const graph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType || 'server',
        label: n.data.label,
        position: n.position,
        tags: [],
        riskCriticality: 'medium' as const,
        interfaces: [],
      })),
      links: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'ethernet' as const,
        bandwidth: 1000,
        latency: 0,
        loss: 0,
        jitter: 0,
        canFail: false,
        failed: false,
      })),
    };

    if (currentTopology) {
      await window.electronAPI.topology.update(currentTopology.id, { graph });
    } else {
      const newTopology = await window.electronAPI.topology.create({
        projectId: currentProject.id,
        name: 'Main Topology',
        graph,
      });
      setCurrentTopology(newTopology);
    }

    alert('Topology saved successfully!');
  };

  if (!currentProject) {
    return (
      <div>
        <div className="toolbar">
          <h1 style={{ fontSize: '24px' }}>Twin Designer</h1>
        </div>
        <div className="content-area">
          <p>Please select a project first.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ flex: 1, fontSize: '24px' }}>Twin Designer - {currentProject.name}</h1>
        <select 
          value={selectedNodeType.type} 
          onChange={(e) => {
            const nodeType = nodeTypes.find(nt => nt.type === e.target.value);
            if (nodeType) setSelectedNodeType(nodeType);
          }}
          style={{ marginRight: '10px', width: 'auto' }}
        >
          {nodeTypes.map((nt) => (
            <option key={nt.type} value={nt.type}>{nt.label}</option>
          ))}
        </select>
        <button onClick={addNode}>Add Node</button>
        <button onClick={handleSave}>
          <Save size={16} style={{ display: 'inline', marginRight: '4px' }} />
          Save
        </button>
      </div>
      <div style={{ height: 'calc(100vh - 60px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
