import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Trash2 } from 'lucide-react';
import { mockAPI } from '../utils/mockAPI';

const SCENARIO_TEMPLATES = [
  {
    id: 'baseline',
    name: 'Baseline Traffic',
    description: 'Normal operating conditions with standard traffic patterns',
  },
  {
    id: 'ddos',
    name: 'DDoS Attack',
    description: 'Distributed Denial of Service attack scenario',
  },
  {
    id: 'breach',
    name: 'Network Breach',
    description: 'Lateral movement simulation after initial compromise',
  },
  {
    id: 'hardware-failure',
    name: 'Hardware Failure',
    description: 'Simulate critical hardware failures and cascading effects',
  },
  {
    id: 'config-error',
    name: 'Configuration Error',
    description: 'Policy misconfiguration causing network issues',
  },
];

export function ScenariosPage() {
  const navigate = useNavigate();
  const { currentProject, currentTopology, setCurrentScenario } = useAppStore();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(SCENARIO_TEMPLATES[0]);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, [currentProject]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      setError(null);
      if (currentProject) {
        const api = window.electronAPI?.scenario || mockAPI.scenario;
        const projectScenarios = await api.getByProjectId(currentProject.id);
        setScenarios(projectScenarios);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
      console.error('Failed to load scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scenarioName.trim()) {
      setError('Scenario name is required');
      return;
    }

    if (!currentProject || !currentTopology) {
      setError('Please select a project and create a topology first');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const api = window.electronAPI?.scenario || mockAPI.scenario;
      const newScenario = await api.create({
        project_id: currentProject.id,
        name: scenarioName,
        description: scenarioDescription,
        faults: [],
        flows: [],
        attack_events: [],
      });

      setScenarios([...scenarios, newScenario]);
      setScenarioName('');
      setScenarioDescription('');
      setShowCreateForm(false);
      setSelectedTemplate(SCENARIO_TEMPLATES[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scenario');
      console.error('Failed to create scenario:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    try {
      setDeleting(true);
      setError(null);
      const api = window.electronAPI?.scenario || mockAPI.scenario;
      await api.delete(scenarioId);
      setScenarios(scenarios.filter(s => s.id !== scenarioId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scenario');
      console.error('Failed to delete scenario:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleRunScenario = (scenario: any) => {
    setCurrentScenario(scenario);
    navigate('/simulation');
  };

  if (!currentProject) {
    return (
      <div>
        <div className="toolbar">
          <h1 style={{ fontSize: '24px' }}>Scenarios</h1>
        </div>
        <div className="content-area">
          <p>Please select a project first.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="toolbar">
          <h1 style={{ fontSize: '24px' }}>Scenarios</h1>
        </div>
        <div className="content-area">
          <p>Loading scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ flex: 1, fontSize: '24px' }}>Scenarios - {currentProject.name}</h1>
        <button onClick={() => setShowCreateForm(true)} disabled={loading || !currentTopology}>
          <Plus size={16} style={{ marginRight: '4px' }} />
          Create Scenario
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

      {!currentTopology && (
        <div style={{
          backgroundColor: '#fef3c7',
          color: '#92400e',
          padding: '12px 16px',
          borderRadius: '4px',
          marginBottom: '16px',
          margin: '16px'
        }}>
          <strong>Note:</strong> Please create or select a topology in Twin Designer before creating scenarios.
        </div>
      )}

      <div className="content-area">
        {showCreateForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3>Create New Scenario</h3>
            <form onSubmit={handleCreateScenario}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                  Scenario Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., DDoS Attack Test"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  required
                  disabled={creating}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                  Template
                </label>
                <select
                  value={selectedTemplate.id}
                  onChange={(e) => {
                    const template = SCENARIO_TEMPLATES.find(t => t.id === e.target.value);
                    if (template) setSelectedTemplate(template);
                  }}
                  disabled={creating}
                  style={{ width: '100%' }}
                >
                  {SCENARIO_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {selectedTemplate.description}
                </p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                  Description (optional)
                </label>
                <textarea
                  placeholder="Additional details about this scenario..."
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  rows={3}
                  disabled={creating}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="button-group">
                <button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} disabled={creating}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {scenarios.length === 0 && !showCreateForm ? (
          <div style={{ textAlign: 'center', marginTop: '60px', color: '#999' }}>
            <p>No scenarios yet. {currentTopology ? 'Create your first scenario to test your topology.' : 'Create a topology in Twin Designer first.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                {deleteConfirm === scenario.id && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    padding: '16px',
                    zIndex: 10
                  }}>
                    <p style={{ marginBottom: '12px', fontWeight: 'bold' }}>Delete "{scenario.name}"?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => handleDeleteScenario(scenario.id)}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        style={{ padding: '6px 12px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => setDeleteConfirm(null)}
                        disabled={deleting}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <h3>{scenario.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(scenario.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#999',
                      cursor: 'pointer',
                      padding: '4px',
                      display: deleteConfirm ? 'none' : 'flex'
                    }}
                    title="Delete scenario"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p style={{ color: '#999', marginTop: '8px', marginBottom: '16px', minHeight: '40px' }}>
                  {scenario.description || 'No description'}
                </p>
                <button
                  onClick={() => handleRunScenario(scenario)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Play size={16} />
                  Run Simulation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
