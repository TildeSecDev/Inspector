import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';

export function SettingsPage() {
  const { roeAccepted, setRoeAccepted } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'accepted' | 'not-accepted'>('not-accepted');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatus(roeAccepted ? 'accepted' : 'not-accepted');
  }, [roeAccepted]);

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
    <div>
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
      </div>
    </div>
  );
}
