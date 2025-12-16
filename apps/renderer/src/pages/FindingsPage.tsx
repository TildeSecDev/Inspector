import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

export function FindingsPage() {
  const navigate = useNavigate();
  const { currentRun } = useAppStore();
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    loadFindings();
  }, [currentRun]);

  const loadFindings = async () => {
    try {
      setLoading(true);
      setError(null);
      if (currentRun) {
        const api = window.electronAPI?.finding || mockAPI.finding;
        const runFindings = await api.getAll();
        setFindings(runFindings);
      } else {
        setFindings([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load findings');
      console.error('Failed to load findings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <AlertTriangle size={20} color="#dc2626" />;
      case 'high':
        return <AlertCircle size={20} color="#f59e0b" />;
      case 'medium':
        return <Info size={20} color="#3b82f6" />;
      case 'low':
        return <CheckCircle size={20} color="#10b981" />;
      default:
        return <Info size={20} color="#6b7280" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' };
      case 'high':
        return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' };
      case 'medium':
        return { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' };
      case 'low':
        return { bg: '#d1fae5', border: '#10b981', text: '#065f46' };
      default:
        return { bg: '#f3f4f6', border: '#6b7280', text: '#374151' };
    }
  };

  const filteredFindings = severityFilter === 'all'
    ? findings
    : findings.filter(f => f.severity.toLowerCase() === severityFilter.toLowerCase());

  const severityCounts = {
    critical: findings.filter(f => f.severity.toLowerCase() === 'critical').length,
    high: findings.filter(f => f.severity.toLowerCase() === 'high').length,
    medium: findings.filter(f => f.severity.toLowerCase() === 'medium').length,
    low: findings.filter(f => f.severity.toLowerCase() === 'low').length,
  };

  if (loading) {
    return (
      <div>
        <div className="toolbar">
          <h1 style={{ fontSize: '24px' }}>Findings</h1>
        </div>
        <div className="content-area">
          <p>Loading findings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ flex: 1, fontSize: '24px' }}>Findings</h1>
        {currentRun && (
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ padding: '6px 12px', marginRight: '8px' }}
          >
            <option value="all">All Severities ({findings.length})</option>
            <option value="critical">Critical ({severityCounts.critical})</option>
            <option value="high">High ({severityCounts.high})</option>
            <option value="medium">Medium ({severityCounts.medium})</option>
            <option value="low">Low ({severityCounts.low})</option>
          </select>
        )}
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
              No simulation run selected. <button onClick={() => navigate('/simulation')} style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline' }}>Run a simulation</button> first.
            </p>
          </div>
        ) : findings.length === 0 ? (
          <div className="card">
            <CheckCircle size={48} color="#10b981" style={{ marginBottom: '16px' }} />
            <h3>No Findings</h3>
            <p style={{ color: '#666', marginTop: '8px' }}>
              Great news! No security or operational issues were detected in this simulation run.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                backgroundColor: '#fee2e2',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #dc2626'
              }}>
                <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Critical</h4>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>
                  {severityCounts.critical}
                </div>
              </div>

              <div style={{
                backgroundColor: '#fef3c7',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #f59e0b'
              }}>
                <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>High</h4>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {severityCounts.high}
                </div>
              </div>

              <div style={{
                backgroundColor: '#dbeafe',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Medium</h4>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
                  {severityCounts.medium}
                </div>
              </div>

              <div style={{
                backgroundColor: '#d1fae5',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #10b981'
              }}>
                <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Low</h4>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
                  {severityCounts.low}
                </div>
              </div>
            </div>

            {/* Findings List */}
            <div>
              {filteredFindings.length === 0 ? (
                <div className="card">
                  <p style={{ color: '#666' }}>No findings with {severityFilter} severity.</p>
                </div>
              ) : (
                filteredFindings.map((finding) => {
                  const colors = getSeverityColor(finding.severity);
                  return (
                    <div
                      key={finding.id}
                      className="card"
                      style={{
                        backgroundColor: colors.bg,
                        borderLeft: `6px solid ${colors.border}`,
                        marginBottom: '16px',
                        padding: '20px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                        {getSeverityIcon(finding.severity)}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, color: colors.text }}>
                              {finding.title}
                            </h3>
                            <span
                              style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: colors.border,
                                color: '#fff'
                              }}
                            >
                              {finding.severity.toUpperCase()}
                            </span>
                          </div>

                          <p style={{ color: '#374151', marginTop: '12px', marginBottom: '12px' }}>
                            {finding.description || 'No description provided'}
                          </p>

                          {finding.evidence && typeof finding.evidence === 'object' && (
                            <div style={{
                              backgroundColor: 'rgba(0,0,0,0.05)',
                              padding: '12px',
                              borderRadius: '4px',
                              marginTop: '12px',
                              fontSize: '14px',
                              fontFamily: 'monospace'
                            }}>
                              <strong>Evidence:</strong>
                              <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(finding.evidence, null, 2)}
                              </pre>
                            </div>
                          )}

                          {finding.remediation && (
                            <div style={{
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #16a34a',
                              borderRadius: '4px',
                              padding: '12px',
                              marginTop: '12px'
                            }}>
                              <strong style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={16} />
                                Recommended Fix:
                              </strong>
                              <p style={{ color: '#065f46', marginTop: '4px', marginBottom: 0 }}>
                                {finding.remediation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
