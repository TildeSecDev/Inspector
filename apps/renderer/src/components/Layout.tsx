import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  FolderOpen, 
  Network, 
  PlayCircle, 
  AlertTriangle, 
  FileText, 
  Settings,
  ListChecks
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

export function Layout() {
  const { roeAccepted, setRoeAccepted } = useAppStore();
  const [loadingRoe, setLoadingRoe] = useState(true);
  const [ackChecked, setAckChecked] = useState(false);

  useEffect(() => {
    const loadRoe = async () => {
      try {
        const saved = window.electronAPI?.settings ? await window.electronAPI.settings.get('roeAccepted') : null;
        const local = typeof localStorage !== 'undefined' ? localStorage.getItem('roeAccepted') : null;
        const accepted = saved === true || local === 'true';
        if (accepted) setRoeAccepted(true);
      } catch {
        /* ignore */
      } finally {
        setLoadingRoe(false);
      }
    };
    loadRoe();
  }, [setRoeAccepted]);

  const handleAccept = async () => {
    if (!ackChecked) return;
    setRoeAccepted(true);
    if (window.electronAPI?.settings) {
      await window.electronAPI.settings.set('roeAccepted', true);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('roeAccepted', 'true');
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2>Inspector Twin</h2>
        <nav>
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>
            <FolderOpen size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Projects
          </NavLink>
          <NavLink to="/designer" className={({ isActive }) => isActive ? 'active' : ''}>
            <Network size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Twin Designer
          </NavLink>
          <NavLink to="/scenarios" className={({ isActive }) => isActive ? 'active' : ''}>
            <ListChecks size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Scenarios
          </NavLink>
          <NavLink to="/simulation" className={({ isActive }) => isActive ? 'active' : ''}>
            <PlayCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Simulation Runner
          </NavLink>
          <NavLink to="/findings" className={({ isActive }) => isActive ? 'active' : ''}>
            <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Findings
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
            <FileText size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Reports
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
            <Settings size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Settings
          </NavLink>
        </nav>
        <div style={{ marginTop: '40px', padding: '16px', backgroundColor: '#1a1a1a', borderRadius: '6px', fontSize: '12px', color: '#999' }}>
          <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ff8800' }}>
            ⚠️ Authorized Testing Only
          </p>
          <p>
            Inspector Twin is designed for simulation and authorized local testing only. 
            Do not use it to target real systems without written permission.
          </p>
        </div>
      </aside>
      <main className="main-content">
        {!loadingRoe && !roeAccepted && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '24px', maxWidth: '640px', width: '90%', color: '#eee' }}>
              <h2 style={{ marginTop: 0, marginBottom: '12px' }}>Authorized Local Testing Only</h2>
              <p style={{ marginBottom: '12px', color: '#ccc' }}>
                Inspector Twin is for simulation and authorized local testing on your own lab resources. 
                It will not target external systems. Security checks and lab services are limited to localhost / 127.0.0.1 / 192.168.x.x.
              </p>
              <ul style={{ marginLeft: '18px', marginBottom: '12px', color: '#bbb' }}>
                <li>No external scanning or attack traffic.</li>
                <li>Docker/Podman labs bind only to localhost.</li>
                <li>Proceed only if you are authorized to test these targets.</li>
              </ul>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ddd' }}>
                <input type="checkbox" checked={ackChecked} onChange={(e) => setAckChecked(e.target.checked)} />
                I understand and will only use Inspector Twin for authorized local testing.
              </label>
              <button disabled={!ackChecked} onClick={handleAccept} style={{ opacity: ackChecked ? 1 : 0.6 }}>
                Enable local testing
              </button>
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
