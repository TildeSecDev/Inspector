import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Play } from 'lucide-react';

export function SimulationRunnerPage() {
  const { currentProject, currentTopology, currentScenario, setCurrentRun } = useAppStore();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunSimulation = async () => {
    if (!window.electronAPI || !currentTopology || !currentScenario) return;

    setRunning(true);
    try {
      const runResult = await window.electronAPI.simulation.run(
        currentTopology.graph,
        currentScenario,
        { verbose: true }
      );
      setResult(runResult);
      setCurrentRun(runResult);
    } catch (error) {
      console.error('Simulation failed:', error);
      alert('Simulation failed: ' + error);
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
        <button onClick={handleRunSimulation} disabled={running || !currentTopology || !currentScenario}>
          <Play size={16} style={{ display: 'inline', marginRight: '4px' }} />
          {running ? 'Running...' : 'Run Simulation'}
        </button>
      </div>
      <div className="content-area">
        {!currentTopology && <p>No topology selected. Create one in Twin Designer.</p>}
        {!currentScenario && currentTopology && <p>No scenario selected. Create one in Scenarios.</p>}
        
        {result && (
          <>
            <div className="card">
              <h3>Simulation Results</h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <h4>Packets Processed</h4>
                  <div className="value">{result.metrics?.packetsProcessed || 0}</div>
                </div>
                <div className="metric-card">
                  <h4>Packets Dropped</h4>
                  <div className="value">{result.metrics?.packetsDropped || 0}</div>
                </div>
                <div className="metric-card">
                  <h4>Policies Evaluated</h4>
                  <div className="value">{result.metrics?.policiesEvaluated || 0}</div>
                </div>
                <div className="metric-card">
                  <h4>Total Findings</h4>
                  <div className="value">{result.findings?.length || 0}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Event Timeline</h3>
              <div className="event-timeline">
                {result.events?.map((event: any, index: number) => (
                  <div key={index} className={`event-item ${event.type === 'packet-dropped' ? 'error' : ''}`}>
                    <strong>[{event.timestamp}ms]</strong> {event.message}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
