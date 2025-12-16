import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { Play, BarChart3 } from 'lucide-react';

export function SimulationRunnerPage() {
  const navigate = useNavigate();
  const { currentProject, currentTopology, currentScenario, setCurrentRun, roeAccepted } = useAppStore();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunSimulation = async () => {
    if (!window.electronAPI || !currentTopology || !currentScenario || !roeAccepted) return;

    setRunning(true);
    setError(null);
    try {
      const runResult = await window.electronAPI.simulation.run(
        currentTopology.graph,
        currentScenario,
        { verbose: true }
      );
      setResult(runResult);
      setCurrentRun(runResult);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('Simulation failed:', err);
    } finally {
      setRunning(false);
    }
  };

  if (!currentProject) {
    return (
      <div>
        <div className="toolbar">
          <h1 style={{ fontSize: '24px' }}>Simulation Runner</h1>
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
        <h1 style={{ flex: 1, fontSize: '24px' }}>Simulation Runner</h1>
        <button 
          onClick={handleRunSimulation} 
          disabled={running || !currentTopology || !currentScenario || !roeAccepted}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Play size={16} />
          {running ? 'Running Simulation...' : 'Run Simulation'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '4px',
          marginBottom: '16px',
          margin: '16px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="content-area">
        {!roeAccepted && (
          <div className="card" style={{
            backgroundColor: '#fef3c7',
            borderColor: '#f59e0b',
            borderLeft: '4px solid #f59e0b'
          }}>
            <p style={{ color: '#92400e', fontWeight: 600 }}>
              ⚠️ Accept the Rules of Engagement in Settings to enable simulation and lab actions.
            </p>
          </div>
        )}
        
        {!currentTopology && (
          <div className="card">
            <p style={{ color: '#666' }}>
              📐 No topology selected. <button onClick={() => navigate('/designer')} style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' }}>Create one in Twin Designer</button>.
            </p>
          </div>
        )}

        {!currentScenario && currentTopology && (
          <div className="card">
            <p style={{ color: '#666' }}>
              📋 No scenario selected. <button onClick={() => navigate('/scenarios')} style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' }}>Create one in Scenarios</button>.
            </p>
          </div>
        )}

        {currentTopology && currentScenario && (
          <div style={{ marginBottom: '24px' }}>
            <div className="card">
              <h3>Configuration</h3>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', width: '150px' }}>Project:</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{currentProject?.name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Topology:</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                      {currentTopology.name || 'Unnamed'} ({currentTopology.graph?.nodes?.length || 0} nodes, {currentTopology.graph?.links?.length || 0} links)
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>Scenario:</td>
                    <td style={{ padding: '8px' }}>{currentScenario.name}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {running && (
          <div className="card" style={{ backgroundColor: '#dbeafe', borderColor: '#0066cc', textAlign: 'center', padding: '40px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '4px solid #0066cc',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
            <p style={{ color: '#0066cc', fontWeight: 'bold' }}>Running simulation...</p>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>This may take a few moments</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {result && !running && (
          <>
            <div className="card">
              <h3>
                <BarChart3 size={20} style={{ marginRight: '8px', display: 'inline' }} />
                Simulation Results
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginTop: '16px'
              }}>
                <div style={{
                  backgroundColor: '#f0f9ff',
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #0066cc'
                }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Packets Processed</h4>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0066cc' }}>
                    {result.metrics?.packetsProcessed || 0}
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#fef2f2',
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #dc2626'
                }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Packets Dropped</h4>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>
                    {result.metrics?.packetsDropped || 0}
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #16a34a'
                }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Policies Evaluated</h4>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>
                    {result.metrics?.policiesEvaluated || 0}
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#fef9e7',
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #f59e0b'
                }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Total Findings</h4>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
                    {result.findings?.length || 0}
                  </div>
                </div>
              </div>
            </div>

            {result.events && result.events.length > 0 && (
              <div className="card">
                <h3>Event Timeline ({result.events.length} events)</h3>
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  padding: '12px'
                }}>
                  {result.events.map((event: any, index: number) => {
                    let color = '#666';
                    let bgColor = '#f9f9f9';
                    
                    if (event.type === 'packet-dropped') {
                      color = '#dc2626';
                      bgColor = '#fee2e2';
                    } else if (event.type === 'policy-violation') {
                      color = '#f59e0b';
                      bgColor = '#fef3c7';
                    } else if (event.type === 'success') {
                      color = '#16a34a';
                      bgColor = '#f0fdf4';
                    }

                    return (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          marginBottom: index < result.events.length - 1 ? '8px' : '0',
                          borderRadius: '4px',
                          backgroundColor: bgColor,
                          borderLeft: `4px solid ${color}`,
                          fontSize: '14px'
                        }}
                      >
                        <span style={{ color: '#999', marginRight: '8px' }}>
                          [{event.timestamp}ms]
                        </span>
                        <span style={{ color }}>{event.message}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result.findings && result.findings.length > 0 && (
              <div className="card">
                <h3>Findings ({result.findings.length})</h3>
                <button
                  onClick={() => navigate('/findings')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginTop: '12px'
                  }}
                >
                  View Detailed Findings
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
