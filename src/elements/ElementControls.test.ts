import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import type { SceneElement } from './ElementTypes.js';
import { createBox } from './PrimitiveFactory.js';
import { createElementControls } from './ElementControls.js';

function makeFolder(): FolderApi {
  return new Pane({ container: document.createElement('div') }).addFolder({ title: 'Element' });
}

function makeElementWith(type: 'boolean' | 'color', value: string): SceneElement {
  return {
    id: 'test-id',
    label: 'Test',
    primitive_type: 'box',
    origin_attributes: [],
    parametric_attributes: [
      {
        id: 'a1',
        attribute_uri_key: 'test.attr',
        attribute_value: value,
        attribute_type: type,
      },
    ],
    fixed_attributes: [],
    child_elements: [],
  };
}

describe('createElementControls', () => {
  it('returns object with bind and clear', () => {
    const controls = createElementControls(makeFolder());
    expect(typeof controls.bind).toBe('function');
    expect(typeof controls.clear).toBe('function');
  });

  it('clear() on empty folder is a no-op', () => {
    expect(() => {
      createElementControls(makeFolder()).clear();
    }).not.toThrow();
  });

  it('clear() after bind removes all children', () => {
    const folder = makeFolder();
    const controls = createElementControls(folder);
    controls.bind(createBox(), () => {
      return;
    });
    controls.clear();
    expect(folder.children.length).toBe(0);
  });

  it('bind twice keeps only 6 children', () => {
    const folder = makeFolder();
    const controls = createElementControls(folder);
    controls.bind(createBox(), () => {
      return;
    });
    controls.bind(createBox(), () => {
      return;
    });
    expect(folder.children.length).toBe(6);
  });

  it('onChange called with updated element when number input changes', () => {
    const folder = makeFolder();
    const controls = createElementControls(folder);
    const box = createBox();
    const changes: SceneElement[] = [];
    controls.bind(box, (el) => {
      changes.push(el);
    });
    // Index 1: first number input (geometry.width) — index 0 is the Name text input
    const inputs = folder.element.querySelectorAll<HTMLInputElement>('input');
    const widthInput = inputs[1];
    expect(widthInput).toBeTruthy();
    if (widthInput) {
      widthInput.value = '5';
      widthInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(changes.length).toBe(1);
    const updated = changes[0];
    const widthAttr = updated?.parametric_attributes.find(
      (a) => a.attribute_uri_key === 'geometry.width',
    );
    expect(widthAttr?.attribute_value).toBe('5');
  });

  it('bind with boolean attribute calls onChange with coerced boolean value', () => {
    const folder = makeFolder();
    const controls = createElementControls(folder);
    const el = makeElementWith('boolean', 'true');
    const changes: SceneElement[] = [];
    controls.bind(el, (u) => {
      changes.push(u);
    });
    expect(folder.children.length).toBe(2); // 1 Name + 1 boolean
  });

  it('bind with color attribute creates a color binding', () => {
    const folder = makeFolder();
    const controls = createElementControls(folder);
    controls.bind(makeElementWith('color', '#ff0000'), () => {
      return;
    });
    expect(folder.children.length).toBe(2); // 1 Name + 1 color
  });

  it('bind(box) adds 6 children to folder (1 Name + 4 parametric + 1 fixed)', () => {
    const folder = makeFolder();
    createElementControls(folder).bind(createBox(), () => {
      return;
    });
    expect(folder.children.length).toBe(6);
  });

  it('onChange called with updated label when Name input changes', () => {
    const folder = makeFolder();
    const controls = createElementControls(folder);
    const box = createBox();
    const changes: SceneElement[] = [];
    controls.bind(box, (el) => {
      changes.push(el);
    });
    const input = folder.element.querySelector<HTMLInputElement>('input');
    expect(input).toBeTruthy();
    if (input) {
      input.value = 'MyBox';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(changes.length).toBe(1);
    expect(changes[0]?.label).toBe('MyBox');
  });
});
