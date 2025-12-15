import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Plus } from 'lucide-react';

export function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const { setCurrentProject } = useAppStore();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    if (window.electronAPI) {
      const allProjects = await window.electronAPI.project.getAll();
      setProjects(allProjects);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      await window.electronAPI.project.create({
        name: projectName,
        description: projectDescription,
      });
      setProjectName('');
      setProjectDescription('');
      setShowCreateForm(false);
      loadProjects();
    }
  };

  const handleSelectProject = (project: any) => {
    setCurrentProject(project);
  };

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ flex: 1, fontSize: '24px' }}>Projects</h1>
        <button onClick={() => setShowCreateForm(true)}>
          <Plus size={16} style={{ display: 'inline', marginRight: '4px' }} />
          New Project
        </button>
      </div>
      <div className="content-area">
        {showCreateForm && (
          <div className="card">
            <h3>Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <input
                type="text"
                placeholder="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={3}
              />
              <div className="button-group">
                <button type="submit">Create</button>
                <button type="button" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {projects.map((project) => (
            <div key={project.id} className="card" style={{ cursor: 'pointer' }} onClick={() => handleSelectProject(project)}>
              <h3>{project.name}</h3>
              <p style={{ color: '#999', marginTop: '8px' }}>{project.description || 'No description'}</p>
              <p style={{ color: '#666', fontSize: '12px', marginTop: '12px' }}>
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>

        {projects.length === 0 && !showCreateForm && (
          <div style={{ textAlign: 'center', marginTop: '60px', color: '#999' }}>
            <p>No projects yet. Create your first project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
