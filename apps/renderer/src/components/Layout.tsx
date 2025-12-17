import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  FolderOpen, 
  Network, 
  FileText, 
  Settings,
  Info,
  X,
  Brain,
  Database,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { mockAPI } from '../utils/mockAPI';

const TAB_INFO = {
  '/projects': 'Manage your network simulation projects. Create new projects to organize different network topologies and scenarios.',
  '/designer': 'Design your network topology with a visual canvas. Add routers, switches, firewalls, servers and more to build your digital twin.',
  '/reports': 'Generate and export reports in JSON or PDF format. Document your simulation results and findings.',
  '/settings': 'Configure application settings and review the Rules of Engagement for authorized testing.',
};

const generateMockTRMs = (projects: any[]) => {
  const projectNames = projects.map((p) => p.name);
  
  return [
    {
      id: 'trm-01',
      name: 'Device Anomaly Detector',
      description: 'Monitors new devices joining the network and evaluates their security posture.',
      status: 'active',
      dataSources: ['Network scans', 'Device inventory', 'Vulnerability databases'],
      access: ['Local network devices', 'DHCP logs', 'ARP tables'],
      connectedProjects: projectNames.slice(0, Math.min(2, projectNames.length)),
      findings: [
        'Unpatched Windows 10 device (CVE-2024-1234)',
        'Suspicious SSH port open on internal server',
        'High traffic anomaly on workstation'
      ],
      confidence: 87
    },
    {
      id: 'trm-02',
      name: 'Identity Threat Analyzer',
      description: 'Analyzes authentication logs and detects lateral movement patterns.',
      status: 'active',
      dataSources: ['Windows Event Logs', 'Azure AD logs', 'Group policy changes'],
      access: ['Active Directory', 'IAM audit logs', 'Sign-in events'],
      connectedProjects: projectNames.length > 0 ? [projectNames[projectNames.length - 1]] : [],
      findings: [
        'Unusual login from non-standard location',
        'Multiple failed authentication attempts detected',
        'Privilege escalation attempt blocked'
      ],
      confidence: 92
    },
    {
      id: 'trm-03',
      name: 'Config Drift Monitor',
      description: 'Detects configuration changes and evaluates security impact.',
      status: 'active',
      dataSources: ['Router configs', 'Firewall rules', 'IaC diffs'],
      access: ['Oxidized/RANCID exports', 'Git repositories', 'API endpoints'],
      connectedProjects: projectNames.slice(0, 1),
      findings: [
        'Firewall ACL rule removed (potential exposure)',
        'Router BGP configuration changed',
        'Policy compliance drift detected'
      ],
      confidence: 78
    },
    {
      id: 'trm-04',
      name: 'Vulnerability Impact Mapper',
      description: 'Maps vulnerable assets and computes exposure paths in the topology.',
      status: 'active',
      dataSources: ['SBOM data', 'Vulnerability scans', 'Patch status'],
      access: ['Endpoint inventory', 'Container registries', 'Grype/Trivy outputs'],
      connectedProjects: projectNames,
      findings: [
        'Critical SQLi vuln in web app (high reachability)',
        'OpenSSL vuln on 3 internal servers',
        '5 unpatched systems detected'
      ],
      confidence: 94
    },
    {
      id: 'trm-05',
      name: 'Segmentation Policy Evaluator',
      description: 'Validates network segmentation and detects trust boundary leaks.',
      status: 'pending',
      dataSources: ['Firewall rules', 'Router ACLs', 'Network policies'],
      access: ['Batfish analysis', 'Reachability matrices', 'Policy DSL'],
      connectedProjects: [],
      findings: [
        'Cross-zone flow detected (potential breach)',
        'DMZ has unexpected access to internal subnet'
      ],
      confidence: 81
    },
    {
      id: 'trm-06',
      name: 'Service Behavior Classifier',
      description: 'Identifies unexpected services and classifies behavior as misconfiguration or misuse.',
      status: 'active',
      dataSources: ['Service discovery', 'Port scanning', 'Traffic analysis'],
      access: ['Network flows', 'Process listings', 'Policy compliance DB'],
      connectedProjects: projectNames.slice(0, 1),
      findings: [
        'Unauthorized HTTP server on internal workstation',
        'Suspicious database port exposed externally',
        'DNS exfiltration attempt logged'
      ],
      confidence: 85
    }
  ];
};



export function Layout() {
  const { roeAccepted, setRoeAccepted } = useAppStore();
  const [loadingRoe, setLoadingRoe] = useState(true);
  const [ackChecked, setAckChecked] = useState(false);
  const [infoPopup, setInfoPopup] = useState<string | null>(null);
  const [showTrms, setShowTrms] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [trmNameInput, setTrmNameInput] = useState('');
  const [creatingTrm, setCreatingTrm] = useState(false);

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

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const loadedProjects = await mockAPI.project.getAll();
        setProjects(loadedProjects || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    loadProjects();
  }, []);

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
                position: 'fixed', 
                left: '262px', 
                top: '80px', 
                background: '#1a1a1a', 
                border: '1px solid #333', 
                borderRadius: '6px', 
                padding: '12px', 
                width: '280px', 
                fontSize: '13px', 
                zIndex: 10000,
                color: '#ccc',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
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
                position: 'fixed', 
                left: '262px', 
                top: '134px', 
                background: '#1a1a1a', 
                border: '1px solid #333', 
                borderRadius: '6px', 
                padding: '12px', 
                width: '280px', 
                fontSize: '13px', 
                zIndex: 10000,
                color: '#ccc',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
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
                position: 'fixed', 
                left: '262px', 
                top: '188px', 
                background: '#1a1a1a', 
                border: '1px solid #333', 
                borderRadius: '6px', 
                padding: '12px', 
                width: '280px', 
                fontSize: '13px', 
                zIndex: 10000,
                color: '#ccc',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
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
                position: 'fixed', 
                left: '262px', 
                top: '242px', 
                background: '#1a1a1a', 
                border: '1px solid #333', 
                borderRadius: '6px', 
                padding: '12px', 
                width: '280px', 
                fontSize: '13px', 
                zIndex: 10000,
                color: '#ccc',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
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

        <button
          onClick={() => setShowTrms(true)}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#1a3a52',
            border: '1px solid #0066cc',
            borderRadius: '6px',
            color: '#0066cc',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0066cc';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1a3a52';
            e.currentTarget.style.color = '#0066cc';
          }}
        >
          <Brain size={16} />
          Inspector Twins
        </button>

        {showTrms && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5000
          }}>
            <div style={{
              background: '#0f0f0f',
              border: '1px solid #333',
              borderRadius: '8px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              color: '#eee'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                borderBottom: '1px solid #333',
                position: 'sticky',
                top: 0,
                background: '#111'
              }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Brain size={24} style={{ color: '#0066cc' }} />
                  Inspector Twins
                </h2>
                <button
                  onClick={() => setShowTrms(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '20px' }}>
                <p style={{ color: '#999', marginBottom: '20px' }}>
                  Tiny Recursive Models (TRMs) with Hierarchical Reasoning Model (HRM) training provide iterative analysis of network security data through hierarchical planning and detail modules.
                </p>

                <button
                  onClick={() => setCreatingTrm(true)}
                  style={{
                    marginBottom: '20px',
                    padding: '10px 16px',
                    backgroundColor: '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0052a3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0066cc';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>+</span>
                  Create New Twin
                </button>

                {creatingTrm && (
                  <div style={{
                    border: '1px solid #0066cc',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#1a1a1a',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#fff' }}>Create New Twin</h4>
                    <input
                      type="text"
                      value={trmNameInput}
                      onChange={(e) => setTrmNameInput(e.target.value)}
                      placeholder="Enter twin name (e.g., Custom Policy Analyzer)"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #333',
                        background: '#0b0b0b',
                        color: '#fff',
                        marginBottom: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => {
                          if (trmNameInput.trim()) {
                            console.log('Creating TRM:', trmNameInput);
                            setTrmNameInput('');
                            setCreatingTrm(false);
                          }
                        }}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#0066cc',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setTrmNameInput('');
                          setCreatingTrm(false);
                        }}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#2a2a2a',
                          color: '#ccc',
                          border: '1px solid #444',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                  {generateMockTRMs(projects).map((trm) => (
                    <div
                      key={trm.id}
                      style={{
                        border: '1px solid #333',
                        borderRadius: '8px',
                        padding: '16px',
                        background: '#1a1a1a',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0066cc';
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 102, 204, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#333';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h3 style={{ margin: '0 0 4px 0', color: '#0066cc', fontSize: '16px' }}>{trm.name}</h3>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background: trm.status === 'active' ? '#10b981' : '#6b7280',
                          color: '#fff'
                        }}>
                          {trm.status.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#999' }}>
                        {trm.description}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#ccc' }}>
                            <Database size={14} />
                            Data Sources
                          </div>
                          <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#999' }}>
                            {trm.dataSources.join(', ')}
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#ccc' }}>
                            <Lock size={14} />
                            Access
                          </div>
                          <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#999' }}>
                            {trm.access.join(', ')}
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#ccc' }}>
                            <Network size={14} />
                            Connected Projects
                          </div>
                          <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#999' }}>
                            {trm.connectedProjects.length > 0 ? trm.connectedProjects.join(', ') : 'None'}
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#ccc' }}>
                            <AlertTriangle size={14} />
                            Latest Findings
                          </div>
                          <div style={{ paddingLeft: '20px', fontSize: '12px' }}>
                            {trm.findings.length > 0 ? (
                              <ul style={{ margin: '0', paddingLeft: '16px', color: '#999' }}>
                                {trm.findings.map((finding, idx) => (
                                  <li key={idx} style={{ marginBottom: '4px' }}>{finding}</li>
                                ))}
                              </ul>
                            ) : (
                              <span style={{ color: '#999' }}>No findings</span>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: '8px', padding: '10px', background: '#111', borderRadius: '4px', fontSize: '11px', color: '#666' }}>
                          Model Confidence: <span style={{ color: '#0066cc', fontWeight: 'bold' }}>{trm.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
