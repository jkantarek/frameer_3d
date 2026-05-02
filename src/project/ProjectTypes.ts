import type { SceneElement } from '../elements/ElementTypes.js';

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Project extends ProjectSummary {
  readonly elements: readonly SceneElement[];
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const s = { id: 'abc', name: 'Test', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
 * const p = { ...s, elements: [{ id: '1', label: 'Box', description: '', parametric_attributes: [], fixed_attributes: [], origin_attributes: [], rotation_attributes: [], child_elements: [] }] };
 * const r = { projects: [s] };
 * expect(s.id).toBe('abc');
 * expect(s.name).toBe('Test');
 * expect(p.elements).toHaveLength(1);
 * expect(r.projects).toHaveLength(1);
 * expect(r.projects[0]?.id).toBe('abc');
 * ```
 */
export interface ProjectRegistry {
  readonly projects: readonly ProjectSummary[];
}
