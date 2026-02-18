import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';

type Endpoint = {
  id: string;
  name: string;
  baseUrl: string;
  healthPath: string;
  method?: string;
  timeoutMs?: number;
};

type DockerContainer = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
};

type HealthStatus = {
  status: 'healthy' | 'unhealthy' | 'unknown';
  message: string;
  latencyMs?: number;
  checkedAt?: string;
};

type UpdateResult = {
  status: 'up-to-date' | 'updated' | 'error';
  message: string;
  previousCommit?: string;
  currentCommit?: string;
  output?: string;
};

export function SettingsPage() {
  const { roeAccepted, setRoeAccepted } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'accepted' | 'not-accepted'>('not-accepted');
  const [message, setMessage] = useState<string | null>(null);
  const architectureUrl = `${import.meta.env.BASE_URL}docs/inspector-architecture.html`;
  const tauriInvoke = useMemo(() => (window as any).__TAURI__?.core?.invoke as ((cmd: string, args?: any) => Promise<any>) | undefined, []);
  const isTauri = useMemo(() => typeof window !== 'undefined' && !!tauriInvoke, [tauriInvoke]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [endpointForm, setEndpointForm] = useState({
    name: '',
    baseUrl: '',
    healthPath: '/health',
  });
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [endpointBusy, setEndpointBusy] = useState(false);
  const [healthById, setHealthById] = useState<Record<string, HealthStatus>>({});
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [dockerError, setDockerError] = useState<string | null>(null);
  const [dockerBusy, setDockerBusy] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);

  useEffect(() => {
    setStatus(roeAccepted ? 'accepted' : 'not-accepted');
  }, [roeAccepted]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadEndpoints(), loadDocker()]);
    };
    init();
  }, []);

  const loadEndpoints = async () => {
    setEndpointError(null);
    try {
      if (isTauri) {
        const data = await tauriInvoke?.('get_registered_endpoints');
        if (!data) throw new Error('Tauri invoke unavailable.');
        setEndpoints(data);
        return;
      }

      const local = typeof localStorage === 'undefined'
        ? []
        : JSON.parse(localStorage.getItem('inspector_endpoints') || '[]');
      setEndpoints(local);
    } catch (err: any) {
      setEndpointError(err?.message || String(err));
    }
  };

  const persistLocalEndpoints = (next: Endpoint[]) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('inspector_endpoints', JSON.stringify(next));
  };

  const registerEndpoint = async () => {
    const name = endpointForm.name.trim();
    const baseUrl = endpointForm.baseUrl.trim();
    const healthPath = endpointForm.healthPath.trim() || '/health';
    if (!name || !baseUrl) {
      setEndpointError('Name and base URL are required.');
      return;
    }
    setEndpointError(null);
    setEndpointBusy(true);
    try {
      if (isTauri) {
        const data = await tauriInvoke?.('register_endpoint', {
          payload: { name, baseUrl, healthPath, method: 'GET', timeoutMs: 5000 },
        });
        if (!data) throw new Error('Tauri invoke unavailable.');
        setEndpoints(data);
      } else {
        const next: Endpoint[] = [
          ...endpoints,
          {
            id: `local-${Date.now()}`,
            name,
            baseUrl,
            healthPath,
            method: 'GET',
            timeoutMs: 5000,
          },
        ];
        setEndpoints(next);
        persistLocalEndpoints(next);
      }

      setEndpointForm({ name: '', baseUrl: '', healthPath: '/health' });
    } catch (err: any) {
      setEndpointError(err?.message || String(err));
    } finally {
      setEndpointBusy(false);
    }
  };

  const removeEndpoint = async (id: string) => {
    setEndpointError(null);
    setEndpointBusy(true);
    try {
      if (isTauri) {
        const data = await tauriInvoke?.('remove_endpoint', { id });
        if (!data) throw new Error('Tauri invoke unavailable.');
        setEndpoints(data);
      } else {
        const next = endpoints.filter((endpoint) => endpoint.id !== id);
        setEndpoints(next);
        persistLocalEndpoints(next);
      }
    } catch (err: any) {
      setEndpointError(err?.message || String(err));
    } finally {
      setEndpointBusy(false);
    }
  };

  const resolveHealthUrl = (endpoint: Endpoint) => {
    try {
      return new URL(endpoint.healthPath || '/health', endpoint.baseUrl).toString();
    } catch {
      return endpoint.baseUrl;
    }
  };

  const checkEndpointHealth = async (endpoint: Endpoint): Promise<HealthStatus> => {
    const url = resolveHealthUrl(endpoint);
    const timeoutMs = endpoint.timeoutMs ?? 5000;
    const started = performance.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: endpoint.method || 'GET',
        signal: controller.signal,
      });
      const latencyMs = Math.round(performance.now() - started);
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        message: response.ok ? `OK (${response.status})` : `HTTP ${response.status}`,
        latencyMs,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'unhealthy',
        message: err?.name === 'AbortError' ? 'Timeout' : (err?.message || 'Failed'),
        checkedAt: new Date().toISOString(),
      };
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const checkAllHealth = async () => {
    if (endpoints.length === 0) return;
    setCheckingHealth(true);
    const updates: Record<string, HealthStatus> = {};
    await Promise.all(
      endpoints.map(async (endpoint) => {
        updates[endpoint.id] = await checkEndpointHealth(endpoint);
      })
    );
    setHealthById((prev) => ({ ...prev, ...updates }));
    setCheckingHealth(false);
  };

  const loadDocker = async () => {
    setDockerError(null);
    setDockerBusy(true);
    try {
      if (!isTauri) {
        setDockerError('Docker status is available in the Tauri desktop build.');
        setContainers([]);
        return;
      }
      const data = await tauriInvoke?.('list_docker_containers');
      if (!data) throw new Error('Tauri invoke unavailable.');
      setContainers(data);
    } catch (err: any) {
      setDockerError(err?.message || String(err));
    } finally {
      setDockerBusy(false);
    }
  };

  const runUpdate = async () => {
    if (!isTauri) {
      setUpdateResult({
        status: 'error',
        message: 'Updates are available only in the desktop app.',
      });
      return;
    }

    setUpdateBusy(true);
    setUpdateResult(null);
    try {
      const result = await tauriInvoke?.('run_app_update', { branch: 'main' });
      if (!result) throw new Error('Tauri invoke unavailable.');
      setUpdateResult(result as UpdateResult);
    } catch (err: any) {
      setUpdateResult({
        status: 'error',
        message: err?.message || String(err),
      });
    } finally {
      setUpdateBusy(false);
    }
  };

  const resetRoe = async () => {
    setLoading(true);
    setMessage(null);
    try {
      setRoeAccepted(false);
      if (window.electronAPI?.settings) {
        await window.electronAPI.settings.set('roeAccepted', false);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('roeAccepted');
      }
      setStatus('not-accepted');
      setMessage('ROE acceptance reset. You will need to re-acknowledge before running checks.');
    } catch (e: any) {
      setMessage(`Failed to reset: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="toolbar">
        <h1 style={{ fontSize: '24px' }}>Settings</h1>
      </div>
      <div className="content-area">
        <div className="card">
          <h3>Rules of Engagement</h3>
          <p style={{ color: '#ccc', marginBottom: '8px' }}>
            Inspector Twin is for authorized local testing only. External targeting is blocked by design.
          </p>
          <p style={{ marginBottom: '12px', color: status === 'accepted' ? '#4ade80' : '#fbbf24', fontWeight: 600 }}>
            Status: {status === 'accepted' ? 'Accepted' : 'Not accepted'}
          </p>
          <div className="button-group">
            <button type="button" onClick={resetRoe} disabled={loading}>
              Reset ROE acceptance
            </button>
          </div>
          {message && <p style={{ marginTop: '10px', color: '#aaa' }}>{message}</p>}
        </div>

        <div className="card">
          <h3>Architecture & Endpoints</h3>
          <div className="settings-grid">
            <div className="settings-column">
              <iframe
                className="architecture-frame"
                title="Inspector Twin Architecture"
                src={architectureUrl}
              />
              <div className="subtle-row">
                <span>Architecture overview (embedded)</span>
                <button
                  type="button"
                  onClick={() => window.open(architectureUrl, '_blank', 'noopener,noreferrer')}
                >
                  Open full page
                </button>
              </div>
            </div>
            <div className="settings-column">
              <div className="stacked-card">
                <div className="stacked-header">
                  <h4>Registered Endpoints</h4>
                  <div className="button-group">
                    <button type="button" onClick={loadEndpoints} disabled={endpointBusy}>
                      Refresh
                    </button>
                    <button type="button" onClick={checkAllHealth} disabled={checkingHealth || endpoints.length === 0}>
                      Check health
                    </button>
                  </div>
                </div>
                {endpointError && <p className="inline-error">{endpointError}</p>}
                {endpoints.length === 0 ? (
                  <p style={{ color: '#999' }}>No endpoints registered yet.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Base URL</th>
                        <th>Health</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoints.map((endpoint) => {
                        const health = healthById[endpoint.id];
                        const status = health?.status || 'unknown';
                        return (
                          <tr key={endpoint.id}>
                            <td>{endpoint.name}</td>
                            <td className="mono">{endpoint.baseUrl}</td>
                            <td>
                              <span className={`status-pill status-${status}`}>
                                {health ? `${health.message}` : 'Unknown'}
                              </span>
                              {health?.latencyMs != null && (
                                <span className="status-meta">{health.latencyMs} ms</span>
                              )}
                            </td>
                            <td className="table-actions">
                              <button type="button" onClick={() => removeEndpoint(endpoint.id)} disabled={endpointBusy}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                <div className="form-grid">
                  <input
                    type="text"
                    placeholder="Endpoint name"
                    value={endpointForm.name}
                    onChange={(event) => setEndpointForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Base URL (https://service.local:8080)"
                    value={endpointForm.baseUrl}
                    onChange={(event) => setEndpointForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Health path (/health)"
                    value={endpointForm.healthPath}
                    onChange={(event) => setEndpointForm((prev) => ({ ...prev, healthPath: event.target.value }))}
                  />
                  <div className="button-row">
                    <button type="button" onClick={registerEndpoint} disabled={endpointBusy}>
                      Register endpoint
                    </button>
                  </div>
                </div>
              </div>

              <div className="stacked-card">
                <div className="stacked-header">
                  <h4>Docker Processes</h4>
                  <button type="button" onClick={loadDocker} disabled={dockerBusy}>
                    Refresh
                  </button>
                </div>
                {dockerError && <p className="inline-error">{dockerError}</p>}
                {containers.length === 0 ? (
                  <p style={{ color: '#999' }}>No running containers detected.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Container</th>
                        <th>Image</th>
                        <th>Status</th>
                        <th>Ports</th>
                      </tr>
                    </thead>
                    <tbody>
                      {containers.map((container) => {
                        const state = container.state?.toLowerCase() || '';
                        const status = state === 'running' || container.status?.startsWith('Up') ? 'healthy' : 'unhealthy';
                        return (
                          <tr key={container.id}>
                            <td>{container.name}</td>
                            <td className="mono">{container.image}</td>
                            <td>
                              <span className={`status-pill status-${status}`}>
                                {container.status || container.state || 'Unknown'}
                              </span>
                            </td>
                            <td className="mono">{container.ports || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Updates</h3>
          <p style={{ color: '#ccc', marginBottom: '8px' }}>
            Pull the latest changes from GitHub and rebuild. Your app data and reports remain intact.
          </p>
          <div className="button-group">
            <button type="button" onClick={runUpdate} disabled={updateBusy}>
              {updateBusy ? 'Updating...' : 'Check for update'}
            </button>
          </div>
          {updateResult && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ color: updateResult.status === 'error' ? '#fca5a5' : '#86efac' }}>
                {updateResult.message}
              </p>
              {updateResult.previousCommit && updateResult.currentCommit && (
                <p style={{ color: '#999', marginTop: '4px' }}>
                  {updateResult.previousCommit} → {updateResult.currentCommit}
                </p>
              )}
              {updateResult.output && (
                <pre className="update-output">{updateResult.output}</pre>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3>About Inspector Twin</h3>
          <p>Version: 0.1.0</p>
          <p style={{ marginTop: '12px', color: '#999' }}>
            Inspector Twin is a digital twin simulation and security assessment platform 
            designed for authorized local testing only.
          </p>
          <p style={{ marginTop: '12px', color: '#ff8800', fontWeight: 'bold' }}>
            ⚠️ Do not use this tool to target real systems without written permission.
          </p>
        </div>

        <div className="card">
          <h3>Architecture Reference</h3>
          <p style={{ color: '#ccc', marginBottom: '8px' }}>
            Open the Inspector Twin architecture overview, including diagrams and component flows.
          </p>
          <div className="button-group">
            <button type="button" onClick={() => window.open(architectureUrl, '_blank', 'noopener,noreferrer')}>
              Open architecture document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
