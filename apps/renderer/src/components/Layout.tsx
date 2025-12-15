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

export function Layout() {
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
        <Outlet />
      </main>
    </div>
  );
}
