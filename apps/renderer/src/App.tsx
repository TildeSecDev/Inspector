import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProjectsPage } from './pages/ProjectsPage';
import { TwinDesignerPage } from './pages/TwinDesignerPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { SimulationRunnerPage } from './pages/SimulationRunnerPage';
import { FindingsPage } from './pages/FindingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="designer" element={<TwinDesignerPage />} />
          <Route path="scenarios" element={<ScenariosPage />} />
          <Route path="simulation" element={<SimulationRunnerPage />} />
          <Route path="findings" element={<FindingsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
