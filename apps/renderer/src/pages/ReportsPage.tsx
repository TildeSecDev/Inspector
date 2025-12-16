import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { FileJson, FileText, Calendar, Clock } from 'lucide-react';

export function ReportsPage() {
  const navigate = useNavigate();
  const { currentRun, currentProject, currentScenario, currentTopology } = useAppStore();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [currentRun]);

  const loadReports = async () => {
    if (!window.electronAPI || !currentRun) {
      setReports([]);
      return;
    }

    try {
      setLoading(true);
      const runReports = await window.electronAPI.report.getByRunId(currentRun.id);
      setReports(runReports);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (format: 'json' | 'pdf') => {
    if (!window.electronAPI || !currentRun || !currentProject) return;

    setGenerating(true);
    setError(null);
    try {
      const reportData = {
        runResult: currentRun,
        scenario: currentScenario,
        graph: currentTopology?.graph,
        projectName: currentProject.name,
      };

      const filename = `${currentProject.name.replace(/\s+/g, '-')}-${Date.now()}.${format}`;
      
      const reportPath = await window.electronAPI.report.generate(reportData, {
        format,
        outputPath: filename,
        includeEvents: true,
        includeMetrics: true,
      });

      await loadReports();
      alert(`Report generated successfully:\n${reportPath}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="toolbar">
          <h1 style={{ fontSize: '24px' }}>Reports</h1>
        </div>
        <div className="content-area">
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ flex: 1, fontSize: '24px' }}>Reports</h1>
        <button 
          onClick={() => handleGenerateReport('json')} 
          disabled={!currentRun || generating}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FileJson size={16} />
          {generating ? 'Generating...' : 'Export JSON'}
        </button>
        <button 
          onClick={() => handleGenerateReport('pdf')} 
          disabled={!currentRun || generating}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FileText size={16} />
          {generating ? 'Generating...' : 'Export PDF'}
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
        {!currentRun ? (
          <div className="card">
            <p style={{ color: '#666' }}>
              No simulation run selected. <button onClick={() => navigate('/simulation')} style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' }}>Run a simulation</button> first to generate reports.
            </p>
          </div>
        ) : (
          <>
            {/* Report Preview Card */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>Current Run Report Preview</h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '150px 1fr',
                gap: '12px',
                fontSize: '14px'
              }}>
                <strong>Project:</strong>
                <span>{currentProject?.name || 'Unknown'}</span>

                <strong>Scenario:</strong>
                <span>{currentScenario?.name || 'Unknown'}</span>

                <strong>Run ID:</strong>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{currentRun.id}</span>

                <strong>Status:</strong>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: currentRun.status === 'success' ? '#d1fae5' : '#fee2e2',
                  color: currentRun.status === 'success' ? '#065f46' : '#991b1b',
                  display: 'inline-block',
                  fontWeight: 'bold'
                }}>
                  {currentRun.status}
                </span>

                <strong>Topology:</strong>
                <span>
                  {currentTopology?.graph?.nodes?.length || 0} nodes, {currentTopology?.graph?.links?.length || 0} links
                </span>

                <strong>Findings:</strong>
                <span style={{ color: currentRun.findings && currentRun.findings.length > 0 ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>
                  {currentRun.findings?.length || 0}
                </span>

                {currentRun.metrics && (
                  <>
                    <strong>Packets Processed:</strong>
                    <span>{currentRun.metrics.packetsProcessed || 0}</span>

                    <strong>Packets Dropped:</strong>
                    <span style={{ color: currentRun.metrics.packetsDropped > 0 ? '#dc2626' : '#10b981' }}>
                      {currentRun.metrics.packetsDropped || 0}
                    </span>
                  </>
                )}
              </div>

              <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #0066cc'
              }}>
                <p style={{ margin: 0, color: '#0066cc' }}>
                  📄 Click "Export JSON" or "Export PDF" above to generate a downloadable report with full details.
                </p>
              </div>
            </div>

            {/* Previously Generated Reports */}
            {reports.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '16px' }}>Previously Generated Reports</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Format</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>File Path</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report, index) => (
                        <tr key={report.id} style={{ borderBottom: index < reports.length - 1 ? '1px solid #eee' : 'none' }}>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: report.format === 'json' ? '#dbeafe' : '#fef3c7',
                              color: report.format === 'json' ? '#1e40af' : '#92400e',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              {report.format.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                            {report.path}
                          </td>
                          <td style={{ padding: '12px', color: '#666' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} />
                              {new Date(report.createdAt).toLocaleDateString()}
                              <Clock size={14} style={{ marginLeft: '8px' }} />
                              {new Date(report.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                // Open file location in system file manager
                                alert(`Report location:\n${report.path}`);
                              }}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#0066cc',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Open Location
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
