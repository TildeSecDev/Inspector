import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function FindingsPage() {
  const { currentRun } = useAppStore();
  const [findings, setFindings] = useState<any[]>([]);

  useEffect(() => {
    if (currentRun && window.electronAPI) {
      loadFindings();
    }
  }, [currentRun]);

  const loadFindings = async () => {
    if (window.electronAPI && currentRun) {
      const runFindings = await window.electronAPI.findings.getByRunId(currentRun.id);
      setFindings(runFindings);
    }
  };

  const getSeverityClass = (severity: string) => {
    return `severity-${severity}`;
  };

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ fontSize: '24px' }}>Findings</h1>
      </div>
      <div className="content-area">
        {!currentRun && <p>No simulation run selected. Run a simulation first.</p>}
        
        {findings.length === 0 && currentRun && (
          <p>No findings from this simulation run.</p>
        )}

        {findings.map((finding) => (
          <div key={finding.id} className="finding-item">
            <h4>
              <span className={getSeverityClass(finding.severity)}>
                [{finding.severity.toUpperCase()}]
              </span>{' '}
              {finding.title}
            </h4>
            <p>{finding.description}</p>
            {finding.remediation && (
              <p style={{ color: '#00aa66', fontStyle: 'italic' }}>
                Remediation: {finding.remediation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
