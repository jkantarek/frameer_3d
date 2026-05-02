import { describe, it, expect } from 'vitest';
import {
  createProject,
  deleteProject,
  saveProject,
  loadProject,
  loadRegistry,
} from './ProjectStore.js';

class FakeStorage {
  private readonly store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const makeStorage = (): FakeStorage => new FakeStorage();

describe('saveProject', () => {
  it('saves project data and upserts summary in registry', () => {
    const s = makeStorage() as unknown as Storage;
    const p = {
      id: 'p1',
      name: 'Test',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      elements: [] as [],
    };
    saveProject(p, s);
    expect(loadProject('p1', s)).toEqual(p);
    expect(loadRegistry(s).projects[0]?.id).toBe('p1');
  });

  it('updates existing summary in registry instead of duplicating', () => {
    const s = makeStorage() as unknown as Storage;
    const p = {
      id: 'p1',
      name: 'Old',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      elements: [] as [],
    };
    saveProject(p, s);
    saveProject({ ...p, name: 'New' }, s);
    const reg = loadRegistry(s);
    expect(reg.projects).toHaveLength(1);
    expect(reg.projects[0]?.name).toBe('New');
  });

  it('preserves other projects when updating one', () => {
    const s = makeStorage() as unknown as Storage;
    const base = { created_at: '2026-01-01', updated_at: '2026-01-01', elements: [] as [] };
    const p1 = { id: 'p1', name: 'First', ...base };
    const p2 = { id: 'p2', name: 'Second', ...base };
    saveProject(p1, s);
    saveProject(p2, s);
    saveProject({ ...p1, name: 'First Updated' }, s);
    const reg = loadRegistry(s);
    expect(reg.projects).toHaveLength(2);
    expect(reg.projects[0]?.name).toBe('First Updated');
    expect(reg.projects[1]?.name).toBe('Second');
  });
});

describe('createProject', () => {
  it('uses default name Untitled Project', () => {
    const s = makeStorage() as unknown as Storage;
    expect(createProject(undefined, s).name).toBe('Untitled Project');
  });

  it('uses provided name', () => {
    const s = makeStorage() as unknown as Storage;
    expect(createProject('My Project', s).name).toBe('My Project');
  });

  it('produces ULID id, empty elements, valid ISO timestamps', () => {
    const s = makeStorage() as unknown as Storage;
    const p = createProject(undefined, s);
    expect(p.id).toHaveLength(26);
    expect(p.elements).toHaveLength(0);
    expect(new Date(p.created_at).getTime()).toBeGreaterThan(0);
  });

  it('persists project to storage', () => {
    const s = makeStorage() as unknown as Storage;
    const p = createProject(undefined, s);
    expect(loadProject(p.id, s)).toEqual(p);
  });
});

describe('deleteProject', () => {
  it('removes project key from storage', () => {
    const s = makeStorage() as unknown as Storage;
    const p = createProject(undefined, s);
    deleteProject(p.id, s);
    expect(loadProject(p.id, s)).toBeUndefined();
  });

  it('removes summary from registry', () => {
    const s = makeStorage() as unknown as Storage;
    const p = createProject(undefined, s);
    deleteProject(p.id, s);
    expect(loadRegistry(s).projects).toHaveLength(0);
  });
});
