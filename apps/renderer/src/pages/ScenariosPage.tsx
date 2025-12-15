import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ScenariosPage() {
  const { currentProject } = useAppStore();
  const [scenarios, setScenarios] = useState<any[]>([]);

  useEffect(() => {
    if (currentProject && window.electronAPI) {
      loadScenarios();
    }
  }, [currentProject]);

  const loadScenarios = async () => {
    if (window.electronAPI && currentProject) {
      const projectScenarios = await window.electronAPI.scenario.getByProjectId(currentProject.id);
      setScenarios(projectScenarios);
    }
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

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ flex: 1, fontSize: '24px' }}>Scenarios - {currentProject.name}</h1>
        <button>Create Scenario</button>
      </div>
      <div className="content-area">
        {scenarios.length === 0 && (
          <p>No scenarios yet. Create your first scenario to test your topology.</p>
        )}
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="card">
            <h3>{scenario.name}</h3>
            <p>{scenario.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
