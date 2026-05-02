import { ulid } from 'ulid';
import type { OriginAttribute, ParametricAttribute, SceneElement } from './ElementTypes.js';

function originAttrs(): readonly OriginAttribute[] {
  return [
    { id: ulid(), dimension_uri_key: 'position.x', dimension_uri_value: 0 },
    { id: ulid(), dimension_uri_key: 'position.y', dimension_uri_value: 0 },
    { id: ulid(), dimension_uri_key: 'position.z', dimension_uri_value: 0 },
  ];
}

function rotationAttrs(): readonly OriginAttribute[] {
  return [
    { id: ulid(), dimension_uri_key: 'rotation.x', dimension_uri_value: 0 },
    { id: ulid(), dimension_uri_key: 'rotation.y', dimension_uri_value: 0 },
    { id: ulid(), dimension_uri_key: 'rotation.z', dimension_uri_value: 0 },
  ];
}

function colorAttr(): ParametricAttribute {
  return {
    id: ulid(),
    attribute_uri_key: 'material.color',
    attribute_value: '#888888',
    attribute_type: 'color',
  };
}

function numAttr(key: string, value: string): ParametricAttribute {
  return { id: ulid(), attribute_uri_key: key, attribute_value: value, attribute_type: 'number' };
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const el = createBox();
 * expect(el.id.length).toBe(26);
 * expect(el.label).toBe('Box');
 * expect(el.description).toBe('');
 * expect(el.child_elements).toEqual([]);
 * expect(el.fixed_attributes.find(a => a.attribute_uri_key === 'geometry.type')?.attribute_value).toBe('box');
 * expect(el.parametric_attributes.length).toBe(4);
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'geometry.width')?.attribute_value).toBe('1');
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'geometry.height')?.attribute_value).toBe('1');
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'geometry.depth')?.attribute_value).toBe('1');
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'material.color')?.attribute_value).toBe('#888888');
 * expect(el.origin_attributes.length).toBe(3);
 * expect(el.origin_attributes.find(a => a.dimension_uri_key === 'position.x')?.dimension_uri_value).toBe(0);
 * expect(el.origin_attributes.find(a => a.dimension_uri_key === 'position.y')?.dimension_uri_value).toBe(0);
 * expect(el.origin_attributes.find(a => a.dimension_uri_key === 'position.z')?.dimension_uri_value).toBe(0);
 * expect(el.rotation_attributes.length).toBe(3);
 * expect(el.rotation_attributes.find(a => a.dimension_uri_key === 'rotation.x')?.dimension_uri_value).toBe(0);
 * expect(el.rotation_attributes.find(a => a.dimension_uri_key === 'rotation.y')?.dimension_uri_value).toBe(0);
 * expect(el.rotation_attributes.find(a => a.dimension_uri_key === 'rotation.z')?.dimension_uri_value).toBe(0);
 * expect(createBox('Custom').label).toBe('Custom');
 * ```
 */
export function createBox(label?: string): SceneElement {
  return {
    id: ulid(),
    label: label ?? 'Box',
    description: '',
    parametric_attributes: [
      numAttr('geometry.width', '1'),
      numAttr('geometry.height', '1'),
      numAttr('geometry.depth', '1'),
      colorAttr(),
    ],
    fixed_attributes: [{ id: ulid(), attribute_uri_key: 'geometry.type', attribute_value: 'box' }],
    origin_attributes: originAttrs(),
    rotation_attributes: rotationAttrs(),
    child_elements: [],
  };
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const el = createSphere();
 * expect(el.id.length).toBe(26);
 * expect(el.label).toBe('Sphere');
 * expect(el.description).toBe('');
 * expect(el.child_elements).toEqual([]);
 * expect(el.fixed_attributes.find(a => a.attribute_uri_key === 'geometry.type')?.attribute_value).toBe('sphere');
 * expect(el.parametric_attributes.length).toBe(2);
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'geometry.radius')?.attribute_value).toBe('1');
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'material.color')?.attribute_value).toBe('#888888');
 * expect(el.origin_attributes.length).toBe(3);
 * expect(createSphere('Custom').label).toBe('Custom');
 * ```
 */
export function createSphere(label?: string): SceneElement {
  return {
    id: ulid(),
    label: label ?? 'Sphere',
    description: '',
    parametric_attributes: [numAttr('geometry.radius', '1'), colorAttr()],
    fixed_attributes: [
      { id: ulid(), attribute_uri_key: 'geometry.type', attribute_value: 'sphere' },
    ],
    origin_attributes: originAttrs(),
    rotation_attributes: [],
    child_elements: [],
  };
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const el = createCylinder();
 * expect(el.id.length).toBe(26);
 * expect(el.label).toBe('Cylinder');
 * expect(el.description).toBe('');
 * expect(el.child_elements).toEqual([]);
 * expect(el.fixed_attributes.find(a => a.attribute_uri_key === 'geometry.type')?.attribute_value).toBe('cylinder');
 * expect(el.parametric_attributes.length).toBe(3);
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'geometry.radius')?.attribute_value).toBe('0.5');
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'geometry.height')?.attribute_value).toBe('2');
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'material.color')?.attribute_value).toBe('#888888');
 * expect(el.origin_attributes.length).toBe(3);
 * expect(createCylinder('Custom').label).toBe('Custom');
 * ```
 */
export function createCylinder(label?: string): SceneElement {
  return {
    id: ulid(),
    label: label ?? 'Cylinder',
    description: '',
    parametric_attributes: [
      numAttr('geometry.radius', '0.5'),
      numAttr('geometry.height', '2'),
      colorAttr(),
    ],
    fixed_attributes: [
      { id: ulid(), attribute_uri_key: 'geometry.type', attribute_value: 'cylinder' },
    ],
    origin_attributes: originAttrs(),
    rotation_attributes: [],
    child_elements: [],
  };
}

/**
 * @example
 * ```ts @import.meta.vitest
 * const el = createPlane();
 * expect(el.id.length).toBe(26);
 * expect(el.label).toBe('Plane');
 * expect(el.description).toBe('');
 * expect(el.child_elements).toEqual([]);
 * expect(el.fixed_attributes.find(a => a.attribute_uri_key === 'geometry.type')?.attribute_value).toBe('plane');
 * expect(el.parametric_attributes.length).toBe(3);
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'geometry.width')?.attribute_value).toBe('2');
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'geometry.height')?.attribute_value).toBe('2');
 * expect(el.parametric_attributes.find(a => a.attribute_uri_key === 'material.color')?.attribute_value).toBe('#888888');
 * expect(el.origin_attributes.length).toBe(3);
 * expect(createPlane('Custom').label).toBe('Custom');
 * ```
 */
export function createPlane(label?: string): SceneElement {
  return {
    id: ulid(),
    label: label ?? 'Plane',
    description: '',
    parametric_attributes: [
      numAttr('geometry.width', '2'),
      numAttr('geometry.height', '2'),
      colorAttr(),
    ],
    fixed_attributes: [
      { id: ulid(), attribute_uri_key: 'geometry.type', attribute_value: 'plane' },
    ],
    origin_attributes: originAttrs(),
    rotation_attributes: [],
    child_elements: [],
  };
}
