import { useState, useCallback, useEffect, useRef } from 'react';
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
import { Save, Plus, Trash2, ChevronLeft, X, Play } from 'lucide-react';
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
  const [selectedNodeType, setSelectedNodeType] = useState(nodeTypes[3]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'designer' | 'scenarios' | 'runner' | 'findings'>('designer');
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [scenarioFormOpen, setScenarioFormOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');
  const [scenarioSaving, setScenarioSaving] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const scenarioFormRef = useRef<HTMLDivElement | null>(null);
  const [activeScenario, setActiveScenario] = useState<any | null>(null);
  
  // Network scan state
  const [networkScanning, setNetworkScanning] = useState(false);
  const [networkScanError, setNetworkScanError] = useState<string | null>(null);
  const [networkScanResults, setNetworkScanResults] = useState<any[]>([]);
  const [networkScanLogs, setNetworkScanLogs] = useState<any[]>([]);
  const [liveScanDevices, setLiveScanDevices] = useState<Record<string, any>>({});
  const [liveScanDeviceOrder, setLiveScanDeviceOrder] = useState<string[]>([]);
  const [scanInterface, setScanInterface] = useState('');
  const [nmapParallel, setNmapParallel] = useState(6);
  const [nmapMinRate, setNmapMinRate] = useState(300);
  const [nmapMaxRetries, setNmapMaxRetries] = useState(2);
  const [nmapMinParallelism, setNmapMinParallelism] = useState('');
  const [nmapMaxParallelism, setNmapMaxParallelism] = useState('');
  const [nmapInitialRtt, setNmapInitialRtt] = useState('250ms');
  const [nmapMaxRtt, setNmapMaxRtt] = useState('1000ms');
  const [nmapHostTimeout, setNmapHostTimeout] = useState(900);
  const [useNmapParallel, setUseNmapParallel] = useState(true);
  const [useMinRate, setUseMinRate] = useState(true);
  const [useMaxRetries, setUseMaxRetries] = useState(true);
  const [useParallelism, setUseParallelism] = useState(true);
  const [useRtt, setUseRtt] = useState(true);
  const [useHostTimeout, setUseHostTimeout] = useState(true);
  const [networkScanCollapsed, setNetworkScanCollapsed] = useState(true);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'failed'>('idle');
  const tauriInvoke = (window as any).__TAURI__?.core?.invoke;
  const tauriListen = (window as any).__TAURI__?.event?.listen;
  const isTauri = typeof window !== 'undefined' && !!tauriInvoke;

  useEffect(() => {
    const loadTopology = async () => {
      if (!currentProject) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const graphs = await mockAPI.graph.getByProjectId(currentProject.id);

        if (graphs.length > 0) {
          const topology = graphs[0];

          if (topology.graph) {
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
                backgroundColor: nodeTypes.find((nt) => nt.type === node.type)?.color || '#666',
                color: '#fff',
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 'bold',
                border: '2px solid #333',
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

  useEffect(() => {
    const loadScenarios = async () => {
      if (!currentProject) return;
      try {
        setScenariosLoading(true);
        const scens = await mockAPI.scenario.getByProjectId(currentProject.id);
        setScenarios(scens || []);
        if (scens && scens.length > 0) setActiveScenario(scens[0]);
      } catch (err) {
        console.error('Failed to load scenarios:', err);
      } finally {
        setScenariosLoading(false);
      }
    };
    loadScenarios();
  }, [currentProject]);

  useEffect(() => {
    if (activeTab !== 'scenarios') {
      setScenarioFormOpen(false);
      setScenarioError(null);
    }
  }, [activeTab]);

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

  const focusScenarioForm = () => {
    setScenarioFormOpen(true);
    requestAnimationFrame(() => {
      if (scenarioFormRef.current) {
        scenarioFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const addScenario = async () => {
    if (!currentProject) return;

    const name = newScenarioName.trim();
    const description = newScenarioDescription.trim();

    if (!name) {
      setScenarioError('Scenario title is required');
      focusScenarioForm();
      return;
    }

    try {
      setScenarioSaving(true);
      setScenarioError(null);
      const created = await mockAPI.scenario.create({
        project_id: currentProject.id,
        name,
        description,
        faults: [],
        flows: [],
        attack_events: [],
      });
      setScenarios((prev) => [...prev, created]);
      setActiveScenario(created);
      setNewScenarioName('');
      setNewScenarioDescription('');
      setScenarioFormOpen(false);
    } catch (err) {
      console.error('Failed to create scenario:', err);
      setScenarioError('Failed to create scenario');
    } finally {
      setScenarioSaving(false);
    }
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
    setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, ...updates } : n)));
    setSelectedNode({ ...selectedNode, ...updates });
  };

  // Load saved network scan results
  useEffect(() => {
    const loadNetworkScans = async () => {
      if (!currentProject) return;
      try {
        const scansKey = `network_scans_${currentProject.id}`;
        const saved = localStorage.getItem(scansKey);
        if (saved) {
          setNetworkScanResults(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to load network scans:', err);
      }
    };
    loadNetworkScans();
  }, [currentProject]);

  useEffect(() => {
    if (!isTauri || !tauriListen) return;
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await tauriListen('network-scan-log', (event: any) => {
          const payload = event.payload as { level?: string; message?: string };
          if (!payload?.message) return;
          setNetworkScanLogs((prev) => {
            const next = [
              ...prev,
              {
                level: payload.level || 'info',
                message: payload.message,
                timestamp: new Date().toISOString(),
              },
            ];
            return next.slice(-500);
          });

          const arpMatch = payload.message.match(/Found:\s+(\d+\.\d+\.\d+\.\d+)\s+\(([0-9A-Fa-f:]{17})\)/);
          if (arpMatch) {
            const ip = arpMatch[1];
            const mac = arpMatch[2];
            setLiveScanDevices((prev) => ({
              ...prev,
              [ip]: {
                ip,
                mac,
                status: prev[ip]?.status || 'discovered',
                lastUpdate: new Date().toISOString(),
              },
            }));
            setLiveScanDeviceOrder((prev) => (prev.includes(ip) ? prev : [...prev, ip]));
            return;
          }

          const scanningMatch = payload.message.match(/Scanning\s+(\d+\.\d+\.\d+\.\d+)/);
          if (scanningMatch) {
            const ip = scanningMatch[1];
            setLiveScanDevices((prev) => ({
              ...prev,
              [ip]: {
                ip,
                mac: prev[ip]?.mac,
                status: 'scanning',
                lastUpdate: new Date().toISOString(),
              },
            }));
            setLiveScanDeviceOrder((prev) => (prev.includes(ip) ? prev : [...prev, ip]));
            return;
          }

          const completedMatch = payload.message.match(/Completed\s+(\d+\.\d+\.\d+\.\d+)/);
          if (completedMatch) {
            const ip = completedMatch[1];
            setLiveScanDevices((prev) => ({
              ...prev,
              [ip]: {
                ip,
                mac: prev[ip]?.mac,
                status: 'completed',
                lastUpdate: new Date().toISOString(),
              },
            }));
            setLiveScanDeviceOrder((prev) => (prev.includes(ip) ? prev : [...prev, ip]));
          }
        });
      } catch (err) {
        console.error('Failed to listen for scan logs:', err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [isTauri]);

  // Trigger network scan
  const runNetworkScan = async () => {
    if (!currentProject) {
      setNetworkScanError('No project selected');
      return;
    }

    setNetworkScanning(true);
    setNetworkScanError(null);
    setNetworkScanLogs([]);
    setLiveScanDevices({});
    setLiveScanDeviceOrder([]);

    try {
      if (isTauri) {
        const minParallelismValue = useParallelism && nmapMinParallelism.trim()
          ? Number(nmapMinParallelism)
          : null;
        const maxParallelismValue = useParallelism && nmapMaxParallelism.trim()
          ? Number(nmapMaxParallelism)
          : null;
        const initialRttValue = useRtt && nmapInitialRtt.trim() ? nmapInitialRtt.trim() : null;
        const maxRttValue = useRtt && nmapMaxRtt.trim() ? nmapMaxRtt.trim() : null;

        // Use Tauri command
        const result = await tauriInvoke('run_network_scan', {
          projectId: currentProject.id,
          interface: scanInterface || null,
          nmapTimeout: useHostTimeout ? nmapHostTimeout : null,
          nmapParallel: useNmapParallel ? nmapParallel : null,
          nmapMinRate: useMinRate ? nmapMinRate : null,
          nmapMaxRetries: useMaxRetries ? nmapMaxRetries : null,
          nmapMinParallelism: Number.isFinite(minParallelismValue as number) ? minParallelismValue : null,
          nmapMaxParallelism: Number.isFinite(maxParallelismValue as number) ? maxParallelismValue : null,
          nmapInitialRtt: initialRttValue,
          nmapMaxRtt: maxRttValue,
        });

        if (result.status === 'success' && result.scan_data) {
          // Save scan result
          const scanResult = {
            id: `scan-${Date.now()}`,
            projectId: currentProject.id,
            timestamp: result.timestamp,
            outputFile: result.output_file,
            data: result.scan_data,
            message: result.message,
          };

          const updatedScans = [...networkScanResults, scanResult];
          setNetworkScanResults(updatedScans);

          // Persist to localStorage
          const scansKey = `network_scans_${currentProject.id}`;
          localStorage.setItem(scansKey, JSON.stringify(updatedScans));

          // Switch to findings tab
          setActiveTab('findings');
        } else {
          setNetworkScanError(result.message || 'Scan failed');
        }
      } else {
        // Browser mode - show instructions
        setNetworkScanError(
          'Network scanning requires the desktop app with root privileges. Run: sudo python3 scripts/network-topology-mapper.py'
        );
      }
    } catch (err: any) {
      setNetworkScanError(err?.message || 'Failed to run network scan');
      console.error('Network scan error:', err);
    } finally {
      setNetworkScanning(false);
    }
  };

  const updateSelectedEdge = (updates: any) => {
    if (!selectedEdge) return;
    setEdges((eds) =>
      eds.map((e) => (e.id === selectedEdge.id ? { ...e, data: { ...e.data, ...updates } } : e))
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

  const handleBuild = async () => {
    if (!currentTopology) {
      setError('Please save topology first before building');
      return;
    }

    try {
      setBuildStatus('building');
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

      const response = await fetch('/api/topology/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topologyId: currentTopology.id, graph }),
      });

      if (!response.ok) {
        throw new Error(`Build failed with status ${response.status}`);
      }

      setBuildStatus('success');
      alert('Topology built successfully!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to build topology';
      setError(errorMsg);
      setBuildStatus('failed');
      console.error('Build failed:', err);
    }
  };

  const handleStatus = async () => {
    if (!currentTopology) return;

    try {
      const response = await fetch(`/api/topology/${currentTopology.id}/status`);
      const data = await response.json();
      alert(`Status: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get status';
      setError(errorMsg);
      console.error('Status check failed:', err);
    }
  };

  const handleStop = async () => {
    if (!currentTopology) return;

    try {
      const response = await fetch(`/api/topology/${currentTopology.id}/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Stop failed with status ${response.status}`);
      }

      setBuildStatus('idle');
      alert('Topology stopped successfully!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stop topology';
      setError(errorMsg);
      console.error('Stop failed:', err);
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

        {activeTab === 'designer' && (
          <>
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
          </>
        )}
        {activeTab === 'scenarios' && (
          <button onClick={focusScenarioForm} disabled={scenarioSaving}>
            <Plus size={16} style={{ marginRight: '4px' }} />
            Add Scenario
          </button>
        )}
        <button onClick={handleSave} disabled={saving}>
          <Save size={16} style={{ marginRight: '4px' }} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '12px 16px',
            borderBottom: '1px solid #f5a5a5',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #333',
          backgroundColor: '#1a1a1a',
          padding: '0 12px',
        }}
      >
        {['designer', 'scenarios', 'findings'].map((tab) => (
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
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {activeTab === 'designer' && (
          <>
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

            <div
              style={{
                width: '320px',
                borderLeft: '1px solid #333',
                backgroundColor: '#0b0b0b',
                color: '#f0f0f0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Properties</h3>
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    setSelectedEdge(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Close properties"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto' }}>
                {!selectedNode && !selectedEdge ? (
                  <div style={{ color: '#999' }}>
                    <p>
                      <strong>Nothing selected</strong>
                    </p>
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

                    <hr style={{ margin: '16px 0', borderColor: '#333' }} />
                    
                    <div style={{ marginTop: '16px' }}>
                      <button
                        onClick={() => setNetworkScanCollapsed(!networkScanCollapsed)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#fff',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          marginBottom: '8px',
                          width: '100%'
                        }}
                      >
                        <span style={{
                          display: 'inline-block',
                          transform: networkScanCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                          fontSize: '16px'
                        }}>
                          ▼
                        </span>
                        Network Scan
                      </button>

                      {!networkScanCollapsed && (
                      <div>
                      <p style={{ fontSize: '11px', marginBottom: '12px', color: '#999' }}>
                        Discover devices on your local network and map topology
                      </p>
                      
                      {!isTauri && (
                        <div style={{
                          backgroundColor: '#331a00',
                          border: '1px solid #664400',
                          padding: '8px',
                          borderRadius: '4px',
                          marginBottom: '12px',
                          fontSize: '11px',
                          color: '#ffaa00'
                        }}>
                          ⚠️ Scanning requires the desktop app
                        </div>
                      )}
                      
                      <input
                        type="text"
                        placeholder="Network interface (optional)"
                        value={scanInterface}
                        onChange={(e) => setScanInterface(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          fontSize: '12px',
                          marginBottom: '8px',
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          color: '#fff',
                          boxSizing: 'border-box'
                        }}
                        disabled={networkScanning}
                      />

                      <div style={{ marginBottom: '10px', padding: '8px', border: '1px solid #222', borderRadius: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>
                          Nmap Performance Tuning
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '6px' }}>
                          <input
                            type="checkbox"
                            checked={useNmapParallel}
                            onChange={(e) => setUseNmapParallel(e.target.checked)}
                            disabled={networkScanning}
                          />
                          Parallel workers
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={nmapParallel}
                          onChange={(e) => setNmapParallel(Number(e.target.value || 1))}
                          disabled={networkScanning || !useNmapParallel}
                          style={{ width: '100%', padding: '6px', fontSize: '11px', marginBottom: '8px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: '#fff', boxSizing: 'border-box' }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '6px' }}>
                          <input
                            type="checkbox"
                            checked={useHostTimeout}
                            onChange={(e) => setUseHostTimeout(e.target.checked)}
                            disabled={networkScanning}
                          />
                          Host timeout (seconds)
                        </label>
                        <input
                          type="number"
                          min={60}
                          value={nmapHostTimeout}
                          onChange={(e) => setNmapHostTimeout(Number(e.target.value || 60))}
                          disabled={networkScanning || !useHostTimeout}
                          style={{ width: '100%', padding: '6px', fontSize: '11px', marginBottom: '8px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: '#fff', boxSizing: 'border-box' }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '6px' }}>
                          <input
                            type="checkbox"
                            checked={useMinRate}
                            onChange={(e) => setUseMinRate(e.target.checked)}
                            disabled={networkScanning}
                          />
                          Min rate (pps)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={nmapMinRate}
                          onChange={(e) => setNmapMinRate(Number(e.target.value || 1))}
                          disabled={networkScanning || !useMinRate}
                          style={{ width: '100%', padding: '6px', fontSize: '11px', marginBottom: '8px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: '#fff', boxSizing: 'border-box' }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '6px' }}>
                          <input
                            type="checkbox"
                            checked={useMaxRetries}
                            onChange={(e) => setUseMaxRetries(e.target.checked)}
                            disabled={networkScanning}
                          />
                          Max retries
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={nmapMaxRetries}
                          onChange={(e) => setNmapMaxRetries(Number(e.target.value || 0))}
                          disabled={networkScanning || !useMaxRetries}
                          style={{ width: '100%', padding: '6px', fontSize: '11px', marginBottom: '8px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: '#fff', boxSizing: 'border-box' }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '6px' }}>
                          <input
                            type="checkbox"
                            checked={useParallelism}
                            onChange={(e) => setUseParallelism(e.target.checked)}
                            disabled={networkScanning}
                          />
                          Probe parallelism (min/max)
                        </label>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                          <input
                            type="number"
                            min={1}
                            placeholder="Min"
                            value={nmapMinParallelism}
                            onChange={(e) => setNmapMinParallelism(e.target.value)}
                            disabled={networkScanning || !useParallelism}
                            style={{ flex: 1, padding: '6px', fontSize: '11px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: '#fff', boxSizing: 'border-box' }}
                          />
                          <input
                            type="number"
                            min={1}
                            placeholder="Max"
                            value={nmapMaxParallelism}
                            onChange={(e) => setNmapMaxParallelism(e.target.value)}
                            disabled={networkScanning || !useParallelism}
                            style={{ flex: 1, padding: '6px', fontSize: '11px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '6px' }}>
                          <input
                            type="checkbox"
                            checked={useRtt}
                            onChange={(e) => setUseRtt(e.target.checked)}
                            disabled={networkScanning}
                          />
                          RTT timeouts
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="Initial (250ms)"
                            value={nmapInitialRtt}
                            onChange={(e) => setNmapInitialRtt(e.target.value)}
                            disabled={networkScanning || !useRtt}
                            style={{ flex: 1, padding: '6px', fontSize: '11px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: '#fff', boxSizing: 'border-box' }}
                          />
                          <input
                            type="text"
                            placeholder="Max (1000ms)"
                            value={nmapMaxRtt}
                            onChange={(e) => setNmapMaxRtt(e.target.value)}
                            disabled={networkScanning || !useRtt}
                            style={{ flex: 1, padding: '6px', fontSize: '11px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={runNetworkScan}
                        disabled={networkScanning || !currentProject}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: networkScanning ? '#555' : '#0066cc',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: networkScanning ? 'wait' : 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {networkScanning ? 'Scanning...' : '🔍 SCAN Network'}
                      </button>

                      {networkScanning && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>
                            Scan in progress. Live output updates below.
                          </div>
                          <progress style={{ width: '100%' }} />
                        </div>
                      )}

                      {(networkScanning || networkScanLogs.length > 0) && (
                        <details style={{ marginTop: '8px' }} open={networkScanning}>
                          <summary style={{ cursor: 'pointer', color: '#999', fontSize: '11px' }}>
                            Live scan output ({networkScanLogs.length})
                          </summary>
                          <div
                            style={{
                              maxHeight: '160px',
                              overflowY: 'auto',
                              backgroundColor: '#111',
                              border: '1px solid #333',
                              borderRadius: '4px',
                              padding: '6px',
                              marginTop: '6px',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {networkScanLogs.length === 0 ? (
                              <div style={{ color: '#666' }}>Waiting for scanner output...</div>
                            ) : (
                              networkScanLogs.map((log: any, index: number) => (
                                <div
                                  key={`${log.timestamp}-${index}`}
                                  style={{ color: log.level === 'error' ? '#ff6666' : '#ccc' }}
                                >
                                  {log.message}
                                </div>
                              ))
                            )}
                          </div>
                        </details>
                      )}

                      {(networkScanning || liveScanDeviceOrder.length > 0) && (
                        <details style={{ marginTop: '8px' }} open={networkScanning}>
                          <summary style={{ cursor: 'pointer', color: '#999', fontSize: '11px' }}>
                            Live devices ({liveScanDeviceOrder.length})
                          </summary>
                          <div
                            style={{
                              maxHeight: '200px',
                              overflowY: 'auto',
                              backgroundColor: '#111',
                              border: '1px solid #333',
                              borderRadius: '4px',
                              padding: '6px',
                              marginTop: '6px',
                              fontSize: '10px'
                            }}
                          >
                            {liveScanDeviceOrder.length === 0 ? (
                              <div style={{ color: '#666' }}>Waiting for ARP discoveries...</div>
                            ) : (
                              liveScanDeviceOrder.map((ip) => {
                                const device = liveScanDevices[ip];
                                const status = device?.status || 'discovered';
                                const statusColor = status === 'completed' ? '#4ade80' : status === 'scanning' ? '#fbbf24' : '#999';
                                return (
                                  <div
                                    key={ip}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '4px 0',
                                      borderBottom: '1px solid #222'
                                    }}
                                  >
                                    <div style={{ color: '#fff', fontFamily: 'monospace' }}>{ip}</div>
                                    <div style={{ color: '#777', fontFamily: 'monospace' }}>{device?.mac || '—'}</div>
                                    <div style={{ color: statusColor }}>{status}</div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </details>
                      )}
                      
                      {networkScanError && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: '#330000',
                          border: '1px solid #660000',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#ff6666'
                        }}>
                          {networkScanError}
                        </div>
                      )}
                      
                      {networkScanResults.length > 0 && (
                        <div style={{ marginTop: '12px', fontSize: '11px' }}>
                          <p style={{ color: '#4ade80', fontWeight: 'bold' }}>
                            ✓ {networkScanResults.length} scan{networkScanResults.length !== 1 ? 's' : ''} completed
                          </p>
                          <button
                            onClick={() => setActiveTab('findings')}
                            style={{
                              marginTop: '6px',
                              width: '100%',
                              padding: '6px',
                              backgroundColor: '#1a1a1a',
                              color: '#0066cc',
                              border: '1px solid #333',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            View in Findings →
                          </button>
                        </div>
                      )}
                      
                      <p style={{ fontSize: '10px', marginTop: '12px', color: '#666' }}>
                        ⚠️ Only scan networks you own or have permission to test
                      </p>
                      </div>
                      )}
                    </div>
                  </div>
                ) : selectedNode ? (
                  <div>
                    <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Node Properties</h3>
                    <div style={{ marginBottom: '12px' }}>
                      <label
                        style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}
                      >
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
                      <label
                        style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}
                      >
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
                      <label
                        style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}
                      >
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
                      <label
                        style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}
                      >
                        Bandwidth (Mbps)
                      </label>
                      <input
                        type="number"
                        value={selectedEdge.data?.bandwidth || 1000}
                        onChange={(e) => updateSelectedEdge({ bandwidth: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label
                        style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px' }}
                      >
                        Latency (ms)
                      </label>
                      <input
                        type="number"
                        value={selectedEdge.data?.latency || 0}
                        onChange={(e) => updateSelectedEdge({ latency: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={selectedEdge.data?.canFail || false}
                          onChange={(e) => updateSelectedEdge({ canFail: e.target.checked })}
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

              <div
                style={{
                  flex: 1,
                  borderTop: '1px solid #333',
                  paddingTop: '12px',
                  overflow: 'auto',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Simulation Runner</h3>
                </div>
                {activeScenario ? (
                  <div
                    style={{
                      border: '1px solid #333',
                      borderRadius: '8px',
                      padding: '12px',
                      background: '#111',
                      marginBottom: '12px',
                    }}
                  >
                    <p style={{ margin: 0, color: '#fff', fontWeight: 'bold' }}>{activeScenario.name}</p>
                    <p style={{ margin: '6px 0 10px 0', color: '#bbb', fontSize: '13px' }}>
                      {activeScenario.description || 'No description provided.'}
                    </p>
                    <button
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#0066cc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <Play size={14} style={{ marginRight: '6px' }} /> Run Scenario
                    </button>
                  </div>
                ) : (
                  <p style={{ color: '#999', marginBottom: '12px' }}>Select a scenario to run.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scenarios.length === 0 ? (
                    <p style={{ color: '#777', fontSize: '13px' }}>No scenarios available.</p>
                  ) : (
                    scenarios.map((scenario: any) => (
                      <button
                        key={scenario.id}
                        onClick={() => setActiveScenario(scenario)}
                        style={{
                          textAlign: 'left',
                          padding: '10px',
                          background: activeScenario?.id === scenario.id ? '#112b45' : '#1a1a1a',
                          color: '#fff',
                          border: '1px solid ' + (activeScenario?.id === scenario.id ? '#0066cc' : '#333'),
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 'bold' }}>{scenario.name}</div>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>
                          {scenario.description || 'No description provided.'}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div style={{ borderTop: '1px solid #333', paddingTop: '12px', marginTop: '12px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#fff' }}>Build Controls</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={handleBuild}
                      disabled={nodes.length === 0 || buildStatus === 'building'}
                      style={{
                        padding: '10px',
                        backgroundColor: buildStatus === 'building' ? '#555' : buildStatus === 'success' ? '#10b981' : '#0066cc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: buildStatus === 'building' ? 'wait' : nodes.length === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                      }}
                    >
                      {buildStatus === 'building' ? '⏳ Building...' : buildStatus === 'success' ? '✓ Build Successful' : 'Build'}
                    </button>
                    {buildStatus === 'success' && (
                      <>
                        <button
                          onClick={handleStatus}
                          style={{
                            padding: '10px',
                            backgroundColor: '#0066cc',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                          }}
                        >
                          Status
                        </button>
                        <button
                          onClick={handleStop}
                          style={{
                            padding: '10px',
                            backgroundColor: '#dc2626',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                          }}
                        >
                          Stop
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'scenarios' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#0f0f0f' }}>
            <h2 style={{ marginBottom: '16px', color: '#fff' }}>Scenarios</h2>
            {scenarioFormOpen && (
              <div
                ref={scenarioFormRef}
                style={{
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#111',
                  marginBottom: '16px',
                }}
              >
                <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>Add Scenario</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#ccc' }}>
                      Scenario Title
                    </label>
                    <input
                      type="text"
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      placeholder="e.g., Ransomware lateral movement"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #444',
                        background: '#0b0b0b',
                        color: '#fff',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#ccc' }}>
                      Description
                    </label>
                    <textarea
                      value={newScenarioDescription}
                      onChange={(e) => setNewScenarioDescription(e.target.value)}
                      placeholder="What does this scenario simulate?"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #444',
                        background: '#0b0b0b',
                        color: '#fff',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  {scenarioError && (
                    <div style={{ color: '#f97316', fontSize: '13px' }}>{scenarioError}</div>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={addScenario}
                      disabled={scenarioSaving}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#0066cc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {scenarioSaving ? 'Adding...' : 'Add Scenario'}
                    </button>
                    <button
                      onClick={() => setScenarioFormOpen(false)}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#2a2a2a',
                        color: '#ccc',
                        border: '1px solid #444',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            {scenariosLoading ? (
              <div style={{ color: '#999' }}>Loading scenarios...</div>
            ) : scenarios.length === 0 ? (
              <div style={{ color: '#999' }}>No scenarios configured for this project</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '12px',
                }}
              >
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
                    onClick={() => setActiveScenario(scenario)}
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

        {activeTab === 'findings' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#0f0f0f' }}>
            <h2 style={{ marginBottom: '16px', color: '#fff' }}>Findings</h2>
            
            {networkScanResults.length === 0 ? (
              <div style={{ color: '#999', fontSize: '14px' }}>
                <p>No network scans yet.</p>
                <p style={{ marginTop: '8px' }}>
                  Use the <strong>SCAN</strong> button in the Properties panel to discover devices on your local network.
                </p>
                <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  Security findings from simulations will also appear here.
                </p>
              </div>
            ) : (
              <div>
                {networkScanResults.map((scan, idx) => (
                  <div
                    key={scan.id}
                    style={{
                      marginBottom: '24px',
                      padding: '16px',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
                          Network Scan #{networkScanResults.length - idx}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#999' }}>
                          {new Date(scan.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#00aa66',
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        ✓ Complete
                      </span>
                    </div>

                    {scan.message && (
                      <p style={{ fontSize: '13px', color: '#4ade80', marginBottom: '12px' }}>
                        {scan.message}
                      </p>
                    )}

                    {scan.data && (
                      <div>
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '14px', color: '#fff', marginBottom: '8px' }}>
                            Network Information
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', fontSize: '12px' }}>
                            <span style={{ color: '#999' }}>Network:</span>
                            <span style={{ color: '#fff', fontFamily: 'monospace' }}>
                              {scan.data.metadata?.network_info?.network_cidr || 'N/A'}
                            </span>
                            <span style={{ color: '#999' }}>Gateway:</span>
                            <span style={{ color: '#fff', fontFamily: 'monospace' }}>
                              {scan.data.metadata?.network_info?.gateway || 'N/A'}
                            </span>
                            <span style={{ color: '#999' }}>Devices Found:</span>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>
                              {Object.keys(scan.data.devices || {}).length}
                            </span>
                          </div>
                        </div>

                        {scan.data.metadata?.topology && (
                          <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '14px', color: '#fff', marginBottom: '8px' }}>
                              Topology Summary
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', fontSize: '12px' }}>
                              <span style={{ color: '#999' }}>Routers:</span>
                              <span style={{ color: '#fff' }}>
                                {scan.data.metadata.topology.routers?.length || 0}
                              </span>
                              <span style={{ color: '#999' }}>Switches:</span>
                              <span style={{ color: '#fff' }}>
                                {scan.data.metadata.topology.switches?.length || 0}
                              </span>
                              <span style={{ color: '#999' }}>Access Points:</span>
                              <span style={{ color: '#fff' }}>
                                {scan.data.metadata.topology.access_points?.length || 0}
                              </span>
                              <span style={{ color: '#999' }}>Endpoints:</span>
                              <span style={{ color: '#fff' }}>
                                {scan.data.metadata.topology.endpoints?.length || 0}
                              </span>
                            </div>
                          </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '14px', color: '#fff', marginBottom: '8px' }}>
                            Discovered Devices
                          </h4>
                          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #333', borderRadius: '4px' }}>
                            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#0f0f0f', borderBottom: '1px solid #333' }}>
                                <tr>
                                  <th style={{ padding: '8px', textAlign: 'left', color: '#999', fontWeight: 'bold' }}>IP Address</th>
                                  <th style={{ padding: '8px', textAlign: 'left', color: '#999', fontWeight: 'bold' }}>Hostname</th>
                                  <th style={{ padding: '8px', textAlign: 'left', color: '#999', fontWeight: 'bold' }}>Device Type</th>
                                  <th style={{ padding: '8px', textAlign: 'left', color: '#999', fontWeight: 'bold' }}>OS</th>
                                  <th style={{ padding: '8px', textAlign: 'left', color: '#999', fontWeight: 'bold' }}>Ports</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(scan.data.devices || {}).map(([ip, device]: [string, any]) => (
                                  <tr key={ip} style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '8px', color: '#0066cc', fontFamily: 'monospace' }}>{ip}</td>
                                    <td style={{ padding: '8px', color: '#fff' }}>{device.hostname || '—'}</td>
                                    <td style={{ padding: '8px', color: '#999' }}>{device.device_type || 'unknown'}</td>
                                    <td style={{ padding: '8px', color: '#999', fontSize: '10px' }}>
                                      {device.os_detection?.name || '—'}
                                    </td>
                                    <td style={{ padding: '8px', color: '#999' }}>
                                      {device.ports?.length || 0} open
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {scan.outputFile && (
                          <div style={{ padding: '12px', backgroundColor: '#0f0f0f', borderRadius: '4px', fontSize: '11px' }}>
                            <p style={{ color: '#999', marginBottom: '4px' }}>Full scan results:</p>
                            <p style={{ color: '#0066cc', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {scan.outputFile}
                            </p>
                            <p style={{ color: '#666', marginTop: '8px', fontSize: '10px' }}>
                              Containerlab and Docker Compose configs also generated
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
