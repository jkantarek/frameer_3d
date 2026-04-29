import type { ElementStoreData, SceneElement } from './ElementTypes.js';

const STORAGE_KEY = 'frameer3d.v1.elements';

function isElementStoreData(value: unknown): value is ElementStoreData {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record['elements']);
}

export function load(storage: Storage = localStorage): ElementStoreData {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { elements: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isElementStoreData(parsed)) return { elements: [] };
    return parsed;
  } catch {
    console.warn('[ElementStore] Failed to parse stored data');
    return { elements: [] };
  }
}

export function save(data: ElementStoreData, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('[ElementStore] Failed to save data (quota exceeded?)');
  }
}

export function addElement(data: ElementStoreData, el: SceneElement): ElementStoreData {
  return { ...data, elements: [...data.elements, el] };
}

function removeFromArray(els: readonly SceneElement[], id: string): readonly SceneElement[] | null {
  let changed = false;
  const next: SceneElement[] = [];
  for (const el of els) {
    if (el.id === id) {
      changed = true;
      continue;
    }
    const newChildren = removeFromArray(el.child_elements, id);
    if (newChildren === null) {
      next.push(el);
    } else {
      changed = true;
      next.push({ ...el, child_elements: newChildren });
    }
  }
  return changed ? next : null;
}

export function removeElement(data: ElementStoreData, id: string): ElementStoreData {
  const next = removeFromArray(data.elements, id);
  return next === null ? data : { ...data, elements: next };
}

function updateInArray(
  els: readonly SceneElement[],
  updated: SceneElement,
): readonly SceneElement[] | null {
  let changed = false;
  const next: SceneElement[] = [];
  for (const el of els) {
    if (el.id === updated.id) {
      changed = true;
      next.push(updated);
      continue;
    }
    const newChildren = updateInArray(el.child_elements, updated);
    if (newChildren === null) {
      next.push(el);
    } else {
      changed = true;
      next.push({ ...el, child_elements: newChildren });
    }
  }
  return changed ? next : null;
}

export function updateElement(data: ElementStoreData, updated: SceneElement): ElementStoreData {
  const next = updateInArray(data.elements, updated);
  return next === null ? data : { ...data, elements: next };
}

function findInArray(els: readonly SceneElement[], id: string): SceneElement | undefined {
  for (const el of els) {
    if (el.id === id) return el;
    const found = findInArray(el.child_elements, id);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function findElement(data: ElementStoreData, id: string): SceneElement | undefined {
  return findInArray(data.elements, id);
}
