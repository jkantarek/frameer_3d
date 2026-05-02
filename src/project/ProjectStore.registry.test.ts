import { describe, it, expect, vi } from 'vitest';
import { loadRegistry, saveRegistry } from './ProjectStore.js';

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

describe('loadRegistry', () => {
  it('returns empty registry when key is absent', () => {
    expect(loadRegistry(makeStorage() as unknown as Storage)).toEqual({ projects: [] });
  });

  it('returns empty registry and warns on corrupt JSON', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.projects', 'NOT_JSON');
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {
      return;
    });
    expect(loadRegistry(s)).toEqual({ projects: [] });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('returns empty registry when shape is invalid', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.projects', '{"projects":"bad"}');
    expect(loadRegistry(s)).toEqual({ projects: [] });
  });

  it('returns empty registry when value is a JSON primitive', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.projects', '"hello"');
    expect(loadRegistry(s)).toEqual({ projects: [] });
  });

  it('returns empty registry when value is JSON null', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.projects', 'null');
    expect(loadRegistry(s)).toEqual({ projects: [] });
  });

  it('ignores projects array entries that are not valid summaries', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.projects', '{"projects":[null]}');
    expect(loadRegistry(s)).toEqual({ projects: [] });
  });

  it('ignores non-object entries in projects array', () => {
    const s = makeStorage() as unknown as Storage;
    s.setItem('frameer3d.v1.projects', '{"projects":["notAnObject"]}');
    expect(loadRegistry(s)).toEqual({ projects: [] });
  });

  it('returns parsed registry when valid', () => {
    const s = makeStorage() as unknown as Storage;
    const reg = {
      projects: [{ id: 'abc', name: 'P1', created_at: '2026-01-01', updated_at: '2026-01-01' }],
    };
    s.setItem('frameer3d.v1.projects', JSON.stringify(reg));
    expect(loadRegistry(s)).toEqual(reg);
  });
});

describe('saveRegistry', () => {
  it('writes registry to correct key', () => {
    const s = makeStorage() as unknown as Storage;
    const reg = { projects: [] };
    saveRegistry(reg, s);
    expect(s.getItem('frameer3d.v1.projects')).toBe(JSON.stringify(reg));
  });
});
