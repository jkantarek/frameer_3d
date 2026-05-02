import { describe, it, expect, vi } from 'vitest';
import { loadProject } from './ProjectStore.js';

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

describe('loadProject', () => {
  it('returns undefined when project key is absent', () => {
    expect(loadProject('missing', makeStorage() as unknown as Storage)).toBeUndefined();
  });

  it('returns undefined and warns on corrupt JSON', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.project.p1', 'NOT_JSON');
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {
      return;
    });
    expect(loadProject('p1', s)).toBeUndefined();
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('returns project when valid', () => {
    const s = makeStorage() as unknown as Storage;
    const project = {
      id: 'p1',
      name: 'Test',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      elements: [],
    };
    s.setItem('frameer3d.v1.project.p1', JSON.stringify(project));
    expect(loadProject('p1', s)).toEqual(project);
  });

  it('normalizes elements missing rotation_attributes to []', () => {
    const s = makeStorage() as unknown as Storage;
    const el = {
      id: 'e1',
      label: 'Box',
      description: '',
      parametric_attributes: [],
      fixed_attributes: [],
      origin_attributes: [],
      child_elements: [],
    };
    const project = {
      id: 'p1',
      name: 'T',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      elements: [el],
    };
    s.setItem('frameer3d.v1.project.p1', JSON.stringify(project));
    expect(loadProject('p1', s)?.elements[0]?.rotation_attributes).toEqual([]);
  });

  it('preserves rotation_attributes when already an array', () => {
    const s = makeStorage() as unknown as Storage;
    const el = {
      id: 'e1',
      label: 'Box',
      description: '',
      parametric_attributes: [],
      fixed_attributes: [],
      origin_attributes: [],
      child_elements: [],
      rotation_attributes: [{ x: 0, y: 0, z: 0 }],
    };
    const project = {
      id: 'p1',
      name: 'T',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      elements: [el],
    };
    s.setItem('frameer3d.v1.project.p1', JSON.stringify(project));
    expect(loadProject('p1', s)?.elements[0]?.rotation_attributes).toHaveLength(1);
  });

  it('returns undefined when project data has wrong shape', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.project.p1', '{"foo":"bar"}');
    expect(loadProject('p1', s)).toBeUndefined();
  });

  it('returns undefined when project data is a JSON primitive', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.project.p1', '"hello"');
    expect(loadProject('p1', s)).toBeUndefined();
  });

  it('returns undefined when project data is JSON null', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.project.p1', 'null');
    expect(loadProject('p1', s)).toBeUndefined();
  });

  it('normalizes null element entry to empty rotation_attributes', () => {
    const s = makeStorage() as unknown as Storage;
    const project = {
      id: 'p1',
      name: 'T',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      elements: [null],
    };
    s.setItem('frameer3d.v1.project.p1', JSON.stringify(project));
    expect(loadProject('p1', s)?.elements[0]?.rotation_attributes).toEqual([]);
  });
});
