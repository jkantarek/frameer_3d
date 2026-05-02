import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneElement } from './ElementTypes.js';
import { createElementControls } from './ElementControls.js';

function makeFolder(): FolderApi {
  return new Pane({ container: document.createElement('div') }).addFolder({ title: 'Element' });
}

function makeSimpleEl(): SceneElement {
  return {
    id: 'simple',
    label: 'Simple',
    description: '',
    parametric_attributes: [],
    fixed_attributes: [],
    origin_attributes: [
      { id: 'ox', dimension_uri_key: 'position.x', dimension_uri_value: 0 },
      { id: 'oy', dimension_uri_key: 'position.y', dimension_uri_value: 0 },
      { id: 'oz', dimension_uri_key: 'position.z', dimension_uri_value: 0 },
    ],
    rotation_attributes: [
      { id: 'rx', dimension_uri_key: 'rotation.x', dimension_uri_value: 0 },
      { id: 'ry', dimension_uri_key: 'rotation.y', dimension_uri_value: 0 },
      { id: 'rz', dimension_uri_key: 'rotation.z', dimension_uri_value: 0 },
    ],
    child_elements: [],
  };
}

function fire(input: HTMLInputElement | null | undefined, value: string): void {
  if (!input) return;
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('createElementControls — position/rotation folders', () => {
  it('bind adds Position and Rotation sub-folders (3 children for simple el)', () => {
    const folder = makeFolder();
    createElementControls(folder).bind(makeSimpleEl(), () => {
      return;
    });
    // 1 Name + 1 Position folder + 1 Rotation folder = 3
    expect(folder.children.length).toBe(3);
  });

  it('position folder fires onChange with updated origin_attributes', () => {
    const folder = makeFolder();
    const controls = createElementControls(folder);
    const changes: SceneElement[] = [];
    controls.bind(makeSimpleEl(), (el) => {
      changes.push(el);
    });
    // tp-txtv_i inputs: [0]=Name, [1]=position.x, [2]=position.y, [3]=position.z
    const inputs = folder.element.querySelectorAll<HTMLInputElement>('input.tp-txtv_i');
    fire(inputs[1], '5');
    expect(changes.length).toBe(1);
    const posX = changes[0]?.origin_attributes.find((a) => a.dimension_uri_key === 'position.x');
    expect(posX?.dimension_uri_value).toBe(5);
  });

  it('rotation folder fires onChange with updated rotation_attributes', () => {
    const folder = makeFolder();
    const controls = createElementControls(folder);
    const changes: SceneElement[] = [];
    controls.bind(makeSimpleEl(), (el) => {
      changes.push(el);
    });
    // tp-txtv_i inputs: [0]=Name, [1-3]=position.x/y/z, [4]=rotation.x, ...
    const inputs = folder.element.querySelectorAll<HTMLInputElement>('input.tp-txtv_i');
    fire(inputs[4], '1');
    expect(changes.length).toBe(1);
    const rotX = changes[0]?.rotation_attributes.find((a) => a.dimension_uri_key === 'rotation.x');
    expect(rotX?.dimension_uri_value).toBe(1);
  });

  it('position folder updates cascade into later rotation change', () => {
    const folder = makeFolder();
    const controls = createElementControls(folder);
    const changes: SceneElement[] = [];
    controls.bind(makeSimpleEl(), (el) => {
      changes.push(el);
    });
    const inputs = folder.element.querySelectorAll<HTMLInputElement>('input.tp-txtv_i');
    fire(inputs[1], '3');
    fire(inputs[4], '0.5');
    expect(changes.length).toBe(2);
    const posX = changes[1]?.origin_attributes.find((a) => a.dimension_uri_key === 'position.x');
    expect(posX?.dimension_uri_value).toBe(3);
    const rotX = changes[1]?.rotation_attributes.find((a) => a.dimension_uri_key === 'rotation.x');
    expect(rotX?.dimension_uri_value).toBe(0.5);
  });
});
