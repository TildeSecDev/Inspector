import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { mockAPI } from '../utils/mockAPI';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { setCurrentProject } = useAppStore();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const api = window.electronAPI?.project || mockAPI.project;
      const allProjects = await api.getAll();
      setProjects(allProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const api = window.electronAPI?.project || mockAPI.project;
      const newProject = await api.create({
        name: projectName,
        description: projectDescription,
      });
      setProjectName('');
      setProjectDescription('');
      setShowCreateForm(false);
      setProjects([...projects, newProject]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      console.error('Failed to create project:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeleting(true);
      setError(null);
      const api = window.electronAPI?.project || mockAPI.project;
      await api.delete(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      console.error('Failed to delete project:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectProject = (project: any) => {
    setCurrentProject(project);
    navigate('/designer');
  };

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ flex: 1, fontSize: '24px' }}>Projects</h1>
        <button onClick={() => setShowCreateForm(true)} disabled={loading}>
          <Plus size={16} style={{ display: 'inline', marginRight: '4px' }} />
          New Project
        </button>
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
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p>Loading projects...</p>
          </div>
        ) : (
          <>
            {showCreateForm && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <h3>Create New Project</h3>
                <form onSubmit={handleCreateProject}>
                  <input
                    type="text"
                    placeholder="Project Name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    disabled={creating}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={3}
                    disabled={creating}
                  />
                  <div className="button-group">
                    <button type="submit" disabled={creating}>
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                    <button type="button" onClick={() => setShowCreateForm(false)} disabled={creating}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {projects.length === 0 && !showCreateForm ? (
              <div style={{ textAlign: 'center', marginTop: '60px', color: '#999' }}>
                <p>No projects yet. Create your first project to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="card"
                    style={{
                      cursor: deleteConfirm === project.id ? 'default' : 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {deleteConfirm === project.id && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        padding: '16px',
                        zIndex: 10
                      }}>
                        <p style={{ marginBottom: '12px', fontWeight: 'bold' }}>Delete "{project.name}"?</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            style={{ padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => handleDeleteProject(project.id)}
                            disabled={deleting}
                          >
                            {deleting ? 'Deleting...' : 'Delete'}
                          </button>
                          <button
                            style={{ padding: '6px 12px', backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => setDeleteConfirm(null)}
                            disabled={deleting}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <div
                      onClick={() => !deleteConfirm && handleSelectProject(project)}
                      style={{ cursor: deleteConfirm ? 'default' : 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <h3>{project.name}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(project.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#999',
                            cursor: 'pointer',
                            padding: '4px',
                            display: deleteConfirm ? 'none' : 'flex'
                          }}
                          title="Delete project"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <p style={{ color: '#999', marginTop: '8px' }}>{project.description || 'No description'}</p>
                      <p style={{ color: '#666', fontSize: '12px', marginTop: '12px' }}>
                        Created: {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
