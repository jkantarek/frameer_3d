import { describe, it, expect, vi } from 'vitest';
import { resolveOrCreateProject } from './ProjectBootstrap.js';
import { saveProject } from './ProjectStore.js';

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

interface FakeLocation {
  search: string;
  pathname: string;
}

interface FakeHistory {
  replaceState(data: unknown, title: string, url: string): void;
  lastUrl: string;
}

function makeFakeHistory(): FakeHistory {
  return {
    lastUrl: '',
    replaceState(_data: unknown, _title: string, url: string): void {
      this.lastUrl = url;
    },
  };
}

describe('resolveOrCreateProject', () => {
  it('no project param → creates new project, sets URL, returns project with empty elements', () => {
    const storage = new FakeStorage();
    const loc: FakeLocation = { search: '', pathname: '/' };
    const hist = makeFakeHistory();
    const project = resolveOrCreateProject(storage, loc, hist);
    expect(project.elements).toHaveLength(0);
    expect(project.id).toBeTruthy();
    expect(hist.lastUrl).toContain('?project=');
  });

  it('known project ID in storage → returns stored project', () => {
    const storage = new FakeStorage();
    const now = new Date().toISOString();
    const stored = {
      id: 'proj-123',
      name: 'My Project',
      created_at: now,
      updated_at: now,
      elements: [],
    };
    saveProject(stored, storage);
    const loc: FakeLocation = { search: '?project=proj-123', pathname: '/' };
    const hist = makeFakeHistory();
    const project = resolveOrCreateProject(storage, loc, hist);
    expect(project.id).toBe('proj-123');
    expect(project.name).toBe('My Project');
  });

  it('unknown project ID in URL → returns fresh project with that exact ID', () => {
    const storage = new FakeStorage();
    const loc: FakeLocation = { search: '?project=unknown-id', pathname: '/' };
    const hist = makeFakeHistory();
    const project = resolveOrCreateProject(storage, loc, hist);
    expect(project.id).toBe('unknown-id');
    expect(project.elements).toHaveLength(0);
  });

  it('corrupt JSON in storage → returns empty project with valid shape + console.warn', () => {
    const storage = new FakeStorage();
    storage.setItem('frameer3d.v1.project.bad-id', 'NOT_JSON{{{');
    const loc: FakeLocation = { search: '?project=bad-id', pathname: '/' };
    const hist = makeFakeHistory();
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {
      return;
    });
    const project = resolveOrCreateProject(storage, loc, hist);
    expect(project.id).toBe('bad-id');
    expect(project.elements).toHaveLength(0);
    expect(typeof project.created_at).toBe('string');
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
