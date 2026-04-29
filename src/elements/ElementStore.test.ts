import type { SceneElement } from './ElementTypes.js';
import {
  addElement,
  findElement,
  load,
  removeElement,
  save,
  updateElement,
} from './ElementStore.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeEl = (id: string, ch: readonly SceneElement[] = []): SceneElement => ({
  id,
  label: 'T',
  description: '',
  parametric_attributes: [],
  fixed_attributes: [],
  origin_attributes: [],
  child_elements: ch,
});

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('load', () => {
  it('absent key returns empty store', () => {
    expect(load()).toEqual({ elements: [] });
  });
  it('valid JSON returns parsed data', () => {
    const data = { elements: [] };
    localStorage.setItem('frameer3d.v1.elements', JSON.stringify(data));
    expect(load()).toEqual(data);
  });
  it('corrupt JSON returns empty store and warns', () => {
    localStorage.setItem('frameer3d.v1.elements', 'NOT_JSON');
    const spy = vi.spyOn(console, 'warn');
    expect(load()).toEqual({ elements: [] });
    expect(spy).toHaveBeenCalledOnce();
  });
  it('null JSON returns empty store', () => {
    localStorage.setItem('frameer3d.v1.elements', 'null');
    expect(load()).toEqual({ elements: [] });
  });
  it('non-object JSON returns empty store', () => {
    localStorage.setItem('frameer3d.v1.elements', '42');
    expect(load()).toEqual({ elements: [] });
  });
  it('object without elements array returns empty store', () => {
    localStorage.setItem('frameer3d.v1.elements', '{}');
    expect(load()).toEqual({ elements: [] });
  });
});

describe('save', () => {
  it('persists data under correct key', () => {
    const data = { elements: [] } as const;
    save(data);
    expect(localStorage.getItem('frameer3d.v1.elements')).toBe(JSON.stringify(data));
  });

  it('swallows QuotaExceededError and warns', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    const spy = vi.spyOn(console, 'warn');
    expect(() => {
      save({ elements: [] });
    }).not.toThrow();
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe('addElement', () => {
  it('appends element to store', () => {
    const el = makeEl('a');
    expect(addElement({ elements: [] }, el).elements).toEqual([el]);
  });

  it('returns new references (immutable)', () => {
    const data = { elements: [] };
    const result = addElement(data, makeEl('a'));
    expect(result).not.toBe(data);
    expect(result.elements).not.toBe(data.elements);
  });

  it('does not mutate original elements array', () => {
    const data = { elements: [makeEl('a')] };
    addElement(data, makeEl('b'));
    expect(data.elements.length).toBe(1);
  });
});

describe('removeElement', () => {
  it('removes top-level element by id', () => {
    const data = { elements: [makeEl('a'), makeEl('b')] };
    expect(removeElement(data, 'a').elements).toEqual([makeEl('b')]);
  });

  it('removes element nested in child_elements', () => {
    const child = makeEl('c');
    const parent = makeEl('p', [child]);
    const result = removeElement({ elements: [parent] }, 'c');
    expect(result.elements[0]?.child_elements).toEqual([]);
  });

  it('returns original reference when id not found', () => {
    const data = { elements: [makeEl('a')] };
    expect(removeElement(data, 'x')).toBe(data);
  });
});

describe('updateElement', () => {
  it('replaces top-level element by id', () => {
    const orig = makeEl('a');
    const updated = { ...orig, label: 'New' };
    expect(updateElement({ elements: [orig] }, updated).elements[0]?.label).toBe('New');
  });

  it('replaces element nested in child_elements', () => {
    const child = makeEl('c');
    const parent = makeEl('p', [child]);
    const updatedChild = { ...child, label: 'New' };
    const result = updateElement({ elements: [parent] }, updatedChild);
    expect(result.elements[0]?.child_elements[0]?.label).toBe('New');
  });

  it('returns original reference when id not found', () => {
    const data = { elements: [makeEl('a')] };
    expect(updateElement(data, makeEl('x'))).toBe(data);
  });
});

describe('findElement', () => {
  it('finds top-level element by id', () => {
    const el = makeEl('a');
    expect(findElement({ elements: [el] }, 'a')).toBe(el);
  });

  it('finds element nested in child_elements', () => {
    const child = makeEl('c');
    const parent = makeEl('p', [child]);
    expect(findElement({ elements: [parent] }, 'c')).toBe(child);
  });

  it('returns undefined when not found', () => {
    expect(findElement({ elements: [] }, 'x')).toBeUndefined();
  });
});
