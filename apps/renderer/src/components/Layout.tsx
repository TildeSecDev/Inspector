import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  FolderOpen, 
  Network, 
  FileText, 
  Settings,
  Info
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { mockAPI } from '../utils/mockAPI';

const TAB_INFO = {
  '/projects': 'Manage your network simulation projects. Create new projects to organize different network topologies and scenarios.',
  '/designer': 'Design your network topology with a visual canvas. Add routers, switches, firewalls, servers and more to build your digital twin.',
  '/reports': 'Generate and export reports in JSON or PDF format. Document your simulation results and findings.',
  '/settings': 'Configure application settings and review the Rules of Engagement for authorized testing.',
};

export function Layout() {
  const { roeAccepted, setRoeAccepted } = useAppStore();
  const [loadingRoe, setLoadingRoe] = useState(true);
  const [ackChecked, setAckChecked] = useState(false);
  const [infoPopup, setInfoPopup] = useState<string | null>(null);

  useEffect(() => {
    const loadRoe = async () => {
      try {
        const api = window.electronAPI?.settings || mockAPI.settings;
        const saved = await api.get('roeAccepted');
        if (saved === true) setRoeAccepted(true);
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
    try {
      const api = window.electronAPI?.settings || mockAPI.settings;
      await api.set('roeAccepted', true);
      setRoeAccepted(true);
    } catch (err) {
      console.error('Failed to save ROE acceptance:', err);
      setRoeAccepted(true);
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2>Inspector Twin</h2>
        <nav>
          <div style={{ position: 'relative' }}>
            <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>
              <FolderOpen size={16} style={{ display: 'inline', marginRight: '8px' }} />
              Projects
            </NavLink>
            <Info 
              size={14} 
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}
              onMouseEnter={() => setInfoPopup('/projects')}
              onMouseLeave={() => setInfoPopup(null)}
            />
            {infoPopup === '/projects' && (
              <div style={{ 
                position: 'absolute', 
                left: '100%', 
                top: 0, 
                marginLeft: '12px', 
                background: '#1a1a1a', 
                border: '1px solid #333', 
                borderRadius: '6px', 
                padding: '12px', 
                width: '280px', 
                fontSize: '13px', 
                zIndex: 1000,
                color: '#ccc',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {TAB_INFO['/projects']}
              </div>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <NavLink to="/designer" className={({ isActive }) => isActive ? 'active' : ''}>
              <Network size={16} style={{ display: 'inline', marginRight: '8px' }} />
              Twin Designer
            </NavLink>
            <Info 
              size={14} 
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}
              onMouseEnter={() => setInfoPopup('/designer')}
              onMouseLeave={() => setInfoPopup(null)}
            />
            {infoPopup === '/designer' && (
              <div style={{ 
                position: 'absolute', 
                left: '100%', 
                top: 0, 
                marginLeft: '12px', 
                background: '#1a1a1a', 
                border: '1px solid #333', 
                borderRadius: '6px', 
                padding: '12px', 
                width: '280px', 
                fontSize: '13px', 
                zIndex: 1000,
                color: '#ccc',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {TAB_INFO['/designer']}
              </div>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
              <FileText size={16} style={{ display: 'inline', marginRight: '8px' }} />
              Reports
            </NavLink>
            <Info 
              size={14} 
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}
              onMouseEnter={() => setInfoPopup('/reports')}
              onMouseLeave={() => setInfoPopup(null)}
            />
            {infoPopup === '/reports' && (
              <div style={{ 
                position: 'absolute', 
                left: '100%', 
                top: 0, 
                marginLeft: '12px', 
                background: '#1a1a1a', 
                border: '1px solid #333', 
                borderRadius: '6px', 
                padding: '12px', 
                width: '280px', 
                fontSize: '13px', 
                zIndex: 1000,
                color: '#ccc',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {TAB_INFO['/reports']}
              </div>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              <Settings size={16} style={{ display: 'inline', marginRight: '8px' }} />
              Settings
            </NavLink>
            <Info 
              size={14} 
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}
              onMouseEnter={() => setInfoPopup('/settings')}
              onMouseLeave={() => setInfoPopup(null)}
            />
            {infoPopup === '/settings' && (
              <div style={{ 
                position: 'absolute', 
                left: '100%', 
                top: 0, 
                marginLeft: '12px', 
                background: '#1a1a1a', 
                border: '1px solid #333', 
                borderRadius: '6px', 
                padding: '12px', 
                width: '280px', 
                fontSize: '13px', 
                zIndex: 1000,
                color: '#ccc',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {TAB_INFO['/settings']}
              </div>
            )}
          </div>
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
