import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Download } from 'lucide-react';

export function ReportsPage() {
  const { currentRun, currentProject, currentScenario, currentTopology } = useAppStore();
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async (format: 'json' | 'pdf') => {
    if (!window.electronAPI || !currentRun || !currentProject) return;

    setGenerating(true);
    try {
      const reportData = {
        runResult: currentRun,
        scenario: currentScenario,
        graph: currentTopology?.graph,
        projectName: currentProject.name,
      };

      const filename = `report-${Date.now()}.${format}`;
      
      const path = await window.electronAPI.report.generate(reportData, {
        format,
        outputPath: filename,
        includeEvents: true,
        includeMetrics: true,
      });

      alert(`Report generated: ${path}`);
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Report generation failed: ' + error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ flex: 1, fontSize: '24px' }}>Reports</h1>
        <button onClick={() => handleGenerateReport('json')} disabled={!currentRun || generating}>
          <Download size={16} style={{ display: 'inline', marginRight: '4px' }} />
          Export JSON
        </button>
        <button onClick={() => handleGenerateReport('pdf')} disabled={!currentRun || generating}>
          <Download size={16} style={{ display: 'inline', marginRight: '4px' }} />
          Export PDF
        </button>
      </div>
      <div className="content-area">
        {!currentRun && <p>No simulation run selected. Run a simulation first to generate reports.</p>}
        
        {currentRun && (
          <div className="card">
            <h3>Report Preview</h3>
            <p>Project: {currentProject?.name}</p>
            <p>Run ID: {currentRun.id}</p>
            <p>Status: {currentRun.status}</p>
            <p>Findings: {currentRun.findings?.length || 0}</p>
            <p style={{ marginTop: '16px', color: '#999' }}>
              Click "Export JSON" or "Export PDF" to generate a full report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
