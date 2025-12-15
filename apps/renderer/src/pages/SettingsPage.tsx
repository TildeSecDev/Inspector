export function SettingsPage() {
  return (
    <div>
      <div className="toolbar">
        <h1 style={{ fontSize: '24px' }}>Settings</h1>
      </div>
      <div className="content-area">
        <div className="card">
          <h3>Application Settings</h3>
          <p style={{ color: '#999' }}>Settings configuration coming soon...</p>
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
