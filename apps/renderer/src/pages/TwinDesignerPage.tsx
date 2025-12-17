import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '../store/appStore';
import { mockAPI } from '../utils/mockAPI';
import { Save, Plus, Trash2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const nodeTypes = [
  { type: 'router', label: 'Router', color: '#0066cc' },
  { type: 'switch', label: 'Switch', color: '#00aa66' },
  { type: 'firewall', label: 'Firewall', color: '#ff4444' },
  { type: 'server', label: 'Server', color: '#9966ff' },
  { type: 'workstation', label: 'Workstation', color: '#666666' },
  { type: 'cloud-service', label: 'Cloud Service', color: '#00ccff' },
  { type: 'database', label: 'Database', color: '#ffaa00' },
  { type: 'iot-device', label: 'IoT Device', color: '#ff6699' },
  { type: 'load-balancer', label: 'Load Balancer', color: '#00ffaa' },
  { type: 'nat', label: 'NAT', color: '#ff9900' },
  { type: 'vpn', label: 'VPN Gateway', color: '#6600ff' },
];

export function TwinDesignerPage() {
  const navigate = useNavigate();
  const { currentProject, currentTopology, setCurrentTopology } = useAppStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeType, setSelectedNodeType] = useState(nodeTypes[3]); // Server default
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'designer' | 'scenarios' | 'runner' | 'findings'>('designer');
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);

  // Load topology on mount
  useEffect(() => {
    const loadTopology = async () => {
      if (!currentProject) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get graphs for the project
        const graphs = await mockAPI.graph.getByProjectId(currentProject.id);
        
        if (graphs.length > 0) {
          const topology = graphs[0]; // Use first topology
          
          if (topology.graph) {
            // Convert stored graph format to React Flow format
            const flowNodes: Node[] = (topology.graph.nodes || []).map((node: any) => ({
              id: node.id,
              type: 'default',
              position: node.position || { x: 0, y: 0 },
              data: {
                label: node.label,
                nodeType: node.type,
                criticality: node.riskCriticality || 'medium',
                tags: node.tags || [],
              },
              style: {
                backgroundColor: nodeTypes.find(nt => nt.type === node.type)?.color || '#666',
                color: '#fff',
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 'bold',
              },
            }));

            const flowEdges: Edge[] = (topology.graph.links || []).map((link: any) => ({
              id: link.id || `${link.source}-${link.target}`,
              source: link.source,
              target: link.target,
              data: {
                bandwidth: link.bandwidth,
                latency: link.latency,
                canFail: link.canFail,
              },
              label: `${link.bandwidth}Mbps`,
            }));

            setNodes(flowNodes);
            setEdges(flowEdges);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load topology');
        console.error('Failed to load topology:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTopology();
  }, [currentProject, setNodes, setEdges]);

  // Load scenarios
  useEffect(() => {
    const loadScenarios = async () => {
      if (!currentProject) return;
      try {
        setScenariosLoading(true);
        const scens = await mockAPI.scenario.getByProjectId(currentProject.id);
        setScenarios(scens || []);
      } catch (err) {
        console.error('Failed to load scenarios:', err);
      } finally {
        setScenariosLoading(false);
      }
    };
    loadScenarios();
  }, [currentProject]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeClick = useCallback((_event: any, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const addNode = () => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: `${selectedNodeType.label} ${nodes.length + 1}`,
        nodeType: selectedNodeType.type,
        criticality: 'medium',
        tags: [],
      },
      style: {
        backgroundColor: selectedNodeType.color,
        color: '#fff',
        padding: '10px',
        borderRadius: '8px',
        fontWeight: 'bold',
        border: '2px solid #333',
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdge) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdge(null);
  };

  const updateSelectedNode = (updates: Partial<Node>) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, ...updates }
          : n
      )
    );
    setSelectedNode({ ...selectedNode, ...updates });
  };

  const updateSelectedEdge = (updates: any) => {
    if (!selectedEdge) return;
    setEdges((eds) =>
      eds.map((e) =>
        e.id === selectedEdge.id
          ? { ...e, data: { ...e.data, ...updates } }
          : e
      )
    );
    setSelectedEdge({ ...selectedEdge, data: { ...selectedEdge.data, ...updates } });
  };

  const handleSave = async () => {
    if (!window.electronAPI || !currentProject) return;

    try {
      setSaving(true);
      setError(null);

      const graph = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data?.nodeType || 'server',
          label: n.data?.label || 'Node',
          position: n.position,
          tags: n.data?.tags || [],
          riskCriticality: n.data?.criticality || 'medium',
          interfaces: [],
        })),
        links: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'ethernet',
          bandwidth: e.data?.bandwidth || 1000,
          latency: e.data?.latency || 0,
          loss: 0,
          jitter: 0,
          canFail: e.data?.canFail || false,
          failed: false,
        })),
      };

      if (currentTopology) {
        await window.electronAPI.topology.update(currentTopology.id, { graph });
      } else {
        const newTopology = await window.electronAPI.topology.create({
          projectId: currentProject.id,
          name: `${currentProject.name} - Main Topology`,
          graph,
        });
        setCurrentTopology(newTopology);
      }

      setError(null);
      alert('Topology saved successfully!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save topology';
      setError(errorMsg);
      console.error('Failed to save topology:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!currentProject) {
    return (
      <div>
        <div className="toolbar">
          <h1 style={{ fontSize: '24px' }}>Twin Designer</h1>
        </div>
        <div className="content-area">
          <p>Please select a project first.</p>
          <button onClick={() => navigate('/projects')} style={{ marginTop: '16px' }}>
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="toolbar">
          <h1 style={{ fontSize: '24px' }}>Twin Designer</h1>
        </div>
        <div className="content-area">
          <p>Loading topology...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <div className="toolbar">
        <button
          onClick={() => navigate('/projects')}
          style={{ marginRight: '12px', padding: '8px' }}
          title="Back to projects"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 style={{ flex: 1, fontSize: '24px' }}>
          {currentProject.name} {currentTopology ? '- Main Topology' : '- New Topology'}
        </h1>

        <select
          value={selectedNodeType.type}
          onChange={(e) => {
            const nodeType = nodeTypes.find((nt) => nt.type === e.target.value);
            if (nodeType) setSelectedNodeType(nodeType);
          }}
          style={{ marginRight: '10px', width: 'auto', padding: '6px' }}
        >
          {nodeTypes.map((nt) => (
            <option key={nt.type} value={nt.type}>
              {nt.label}
            </option>
          ))}
        </select>
        <button onClick={addNode} disabled={saving}>
          <Plus size={16} style={{ marginRight: '4px' }} />
          Add Node
        </button>
        <button onClick={handleSave} disabled={saving}>
          <Save size={16} style={{ marginRight: '4px' }} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderBottom: '1px solid #f5a5a5'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #333',
        backgroundColor: '#1a1a1a',
        padding: '0 12px',
      }}>
        {['designer', 'scenarios', 'runner', 'findings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '12px 16px',
              border: 'none',
              backgroundColor: activeTab === tab ? '#0066cc' : 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              textTransform: 'capitalize',
              borderBottom: activeTab === tab ? '3px solid #0066cc' : '3px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'runner' ? 'Simulation Runner' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Designer Tab */}
        {activeTab === 'designer' && (
          <>
            {/* Canvas */}
            <div style={{ flex: 1 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                fitView
              >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
              </ReactFlow>
            </div>

            {/* Properties Panel */}
            <div style={{
              width: '300px',
              borderLeft: '1px solid #333',
              overflow: 'auto',
              backgroundColor: '#0b0b0b',
              color: '#f0f0f0',
              padding: '16px',
            }}>
          {!selectedNode && !selectedEdge ? (
            <div style={{ color: '#999' }}>
              <p><strong>Properties</strong></p>
              <p style={{ fontSize: '12px', marginTop: '12px' }}>
                Click a node or link to edit properties
              </p>
              <hr style={{ margin: '16px 0', borderColor: '#333' }} />
              <p style={{ fontSize: '12px', marginTop: '12px' }}>
                <strong>Nodes:</strong> {nodes.length}
              </p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                <strong>Links:</strong> {edges.length}
              </p>
            </div>
          ) : selectedNode ? (
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Node Properties</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Label
                </label>
                <input
                  type="text"
                  value={selectedNode.data?.label || ''}
                  onChange={(e) =>
                    updateSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, label: e.target.value },
                    })
                  }
                  style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Criticality
                </label>
                <select
                  value={selectedNode.data?.criticality || 'medium'}
                  onChange={(e) =>
                    updateSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, criticality: e.target.value },
                    })
                  }
                  style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Type: {selectedNode.data?.nodeType || 'Unknown'}
                </label>
              </div>

              <button
                onClick={deleteSelectedNode}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} style={{ marginRight: '4px' }} />
                Delete Node
              </button>
            </div>
          ) : selectedEdge ? (
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Link Properties</h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Bandwidth (Mbps)
                </label>
                <input
                  type="number"
                  value={selectedEdge.data?.bandwidth || 1000}
                  onChange={(e) =>
                    updateSelectedEdge({ bandwidth: parseInt(e.target.value) || 0 })
                  }
                  style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                  Latency (ms)
                </label>
                <input
                  type="number"
                  value={selectedEdge.data?.latency || 0}
                  onChange={(e) =>
                    updateSelectedEdge({ latency: parseInt(e.target.value) || 0 })
                  }
                  style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedEdge.data?.canFail || false}
                    onChange={(e) =>
                      updateSelectedEdge({ canFail: e.target.checked })
                    }
                  />
                  <span style={{ fontSize: '12px' }}>Can Fail</span>
                </label>
              </div>

              <button
                onClick={deleteSelectedEdge}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} style={{ marginRight: '4px' }} />
                Delete Link
              </button>
            </div>
          ) : null}
        </div>
          </>
        )}

        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#0f0f0f' }}>
            <h2 style={{ marginBottom: '16px', color: '#fff' }}>Scenarios</h2>
            {scenariosLoading ? (
              <div style={{ color: '#999' }}>Loading scenarios...</div>
            ) : scenarios.length === 0 ? (
              <div style={{ color: '#999' }}>No scenarios configured for this project</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                {scenarios.map((scenario: any) => (
                  <div
                    key={scenario.id}
                    style={{
                      border: '1px solid #333',
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: '#1a1a1a',
                      color: '#fff',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0066cc')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#333')}
                  >
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{scenario.name}</h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#999' }}>
                      {scenario.description}
                    </p>
                    <button
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#0066cc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Run Simulation
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Simulation Runner Tab */}
        {activeTab === 'runner' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#0f0f0f' }}>
            <h2 style={{ marginBottom: '16px', color: '#fff' }}>Simulation Runner</h2>
            <div style={{ color: '#999', fontSize: '14px' }}>
              <p>Select a scenario from the Scenarios tab to run a simulation.</p>
              <p>View real-time metrics, packet flows, policy evaluations, and event timelines.</p>
            </div>
          </div>
        )}

        {/* Findings Tab */}
        {activeTab === 'findings' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#0f0f0f' }}>
            <h2 style={{ marginBottom: '16px', color: '#fff' }}>Findings</h2>
            <div style={{ color: '#999', fontSize: '14px' }}>
              <p>Security findings from simulations will appear here.</p>
              <p>Run scenarios to discover findings, then review them by severity.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
