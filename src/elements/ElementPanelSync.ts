import type { OriginAttribute, SceneElement } from './ElementTypes.js';

interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Transformable {
  readonly position: Vec3;
  readonly rotation: Vec3;
}

function syncVec(
  attrs: readonly OriginAttribute[],
  prefix: string,
  vec: Vec3,
): readonly OriginAttribute[] {
  return attrs.map((a) => {
    if (a.dimension_uri_key === `${prefix}.x`) return { ...a, dimension_uri_value: vec.x };
    if (a.dimension_uri_key === `${prefix}.y`) return { ...a, dimension_uri_value: vec.y };
    if (a.dimension_uri_key === `${prefix}.z`) return { ...a, dimension_uri_value: vec.z };
    return a;
  });
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const el = {
 *   id: '1', label: 'Box', description: '',
 *   parametric_attributes: [], fixed_attributes: [], child_elements: [],
 *   origin_attributes: [
 *     { id: 'ox', dimension_uri_key: 'position.x', dimension_uri_value: 0 },
 *     { id: 'oy', dimension_uri_key: 'position.y', dimension_uri_value: 0 },
 *     { id: 'oz', dimension_uri_key: 'position.z', dimension_uri_value: 0 },
 *   ],
 *   rotation_attributes: [
 *     { id: 'rx', dimension_uri_key: 'rotation.x', dimension_uri_value: 0 },
 *     { id: 'ry', dimension_uri_key: 'rotation.y', dimension_uri_value: 0 },
 *     { id: 'rz', dimension_uri_key: 'rotation.z', dimension_uri_value: 0 },
 *   ],
 * };
 * const obj = { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0.7, y: 0.4, z: 0.2 } };
 * const updated = applyObjTransform(el, obj);
 * expect(updated.origin_attributes.find(a => a.dimension_uri_key === 'position.x')?.dimension_uri_value).toBe(1);
 * expect(updated.rotation_attributes.find(a => a.dimension_uri_key === 'rotation.x')?.dimension_uri_value).toBe(0.7);
 * const unknown = { id: 'u', dimension_uri_key: 'unknown', dimension_uri_value: 99 };
 * const el2 = { ...el, origin_attributes: [unknown], rotation_attributes: [unknown] };
 * const updated2 = applyObjTransform(el2, obj);
 * expect(updated2.origin_attributes[0]?.dimension_uri_value).toBe(99);
 * expect(updated2.rotation_attributes[0]?.dimension_uri_value).toBe(99);
 * ```
 */
export function applyObjTransform(el: SceneElement, obj: Transformable): SceneElement {
  return {
    ...el,
    origin_attributes: syncVec(el.origin_attributes, 'position', obj.position),
    rotation_attributes: syncVec(el.rotation_attributes, 'rotation', obj.rotation),
  };
}
