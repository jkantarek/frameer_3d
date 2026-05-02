import { ulid } from 'ulid';
import type { SceneElement } from '../elements/ElementTypes.js';
import type { Project, ProjectRegistry, ProjectSummary } from './ProjectTypes.js';

const REGISTRY_KEY = 'frameer3d.v1.projects';

function projectKey(id: string): string {
  return `frameer3d.v1.project.${id}`;
}

function isSummary(v: unknown): v is ProjectSummary {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r['id'] === 'string' &&
    typeof r['name'] === 'string' &&
    typeof r['created_at'] === 'string' &&
    typeof r['updated_at'] === 'string'
  );
}

function isRegistry(v: unknown): v is ProjectRegistry {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return Array.isArray(r['projects']) && (r['projects'] as unknown[]).every(isSummary);
}

function isProjectData(
  v: unknown,
): v is ProjectSummary & { readonly elements: readonly unknown[] } {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return isSummary(r) && Array.isArray(r['elements']);
}

function normalizeEl(el: unknown): SceneElement {
  const r = (typeof el === 'object' && el !== null ? el : {}) as Record<string, unknown>;
  const rotation = Array.isArray(r['rotation_attributes'])
    ? (r['rotation_attributes'] as SceneElement['rotation_attributes'])
    : ([] as unknown as SceneElement['rotation_attributes']);
  return { ...(r as unknown as SceneElement), rotation_attributes: rotation };
}

export function loadRegistry(storage: Storage = localStorage): ProjectRegistry {
  const raw = storage.getItem(REGISTRY_KEY);
  if (raw === null) return { projects: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRegistry(parsed)) return { projects: [] };
    return parsed;
  } catch {
    console.warn('[ProjectStore] Failed to parse project registry');
    return { projects: [] };
  }
}

export function saveRegistry(registry: ProjectRegistry, storage: Storage = localStorage): void {
  storage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export function loadProject(id: string, storage: Storage = localStorage): Project | undefined {
  const raw = storage.getItem(projectKey(id));
  if (raw === null) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isProjectData(parsed)) return undefined;
    return {
      id: parsed.id,
      name: parsed.name,
      created_at: parsed.created_at,
      updated_at: parsed.updated_at,
      elements: (parsed.elements as unknown[]).map(normalizeEl),
    };
  } catch {
    console.warn(`[ProjectStore] Failed to parse project ${id}`);
    return undefined;
  }
}

export function saveProject(project: Project, storage: Storage = localStorage): void {
  storage.setItem(projectKey(project.id), JSON.stringify(project));
  const registry = loadRegistry(storage);
  const summary: ProjectSummary = {
    id: project.id,
    name: project.name,
    created_at: project.created_at,
    updated_at: project.updated_at,
  };
  const idx = registry.projects.findIndex((p) => p.id === project.id);
  const projects =
    idx >= 0
      ? registry.projects.map((p, i) => (i === idx ? summary : p))
      : [...registry.projects, summary];
  saveRegistry({ projects }, storage);
}

export function createProject(name = 'Untitled Project', storage: Storage = localStorage): Project {
  const now = new Date().toISOString();
  const project: Project = { id: ulid(), name, created_at: now, updated_at: now, elements: [] };
  saveProject(project, storage);
  return project;
}

export function deleteProject(id: string, storage: Storage = localStorage): void {
  storage.removeItem(projectKey(id));
  const registry = loadRegistry(storage);
  saveRegistry({ projects: registry.projects.filter((p) => p.id !== id) }, storage);
}
