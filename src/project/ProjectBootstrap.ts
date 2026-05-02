import { createProject, loadProject, saveProject } from './ProjectStore.js';
import { getActiveProjectId, setActiveProjectId } from './ProjectRouter.js';
import type { Project } from './ProjectTypes.js';

type LocationLike = Pick<Location, 'search' | 'pathname'>;
type HistoryLike = Pick<History, 'replaceState'>;

export function resolveOrCreateProject(
  storage: Storage = localStorage,
  location: LocationLike = window.location,
  history: HistoryLike = window.history,
): Project {
  const id = getActiveProjectId(location);
  if (id === undefined) {
    const project = createProject('Untitled Project', storage);
    setActiveProjectId(project.id, history);
    return project;
  }
  const loaded = loadProject(id, storage);
  if (loaded !== undefined) return loaded;
  const now = new Date().toISOString();
  const fresh: Project = {
    id,
    name: 'Untitled Project',
    created_at: now,
    updated_at: now,
    elements: [],
  };
  saveProject(fresh, storage);
  return fresh;
}
