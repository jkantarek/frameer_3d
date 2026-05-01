import type { FolderApi } from 'tweakpane';
import { Pane } from 'tweakpane';
import type { SceneManager } from '../scene/SceneManager.js';
import type { TransformGizmoApi } from '../scene/TransformGizmo.js';
import type { ElementStoreData, SceneElement } from './ElementTypes.js';
import { load, save, addElement, removeElement, updateElement } from './ElementStore.js';
import { createElementRenderer } from './ElementRenderer.js';
import { createElementControls } from './ElementControls.js';
import { createBox, createSphere, createCylinder, createPlane } from './PrimitiveFactory.js';
import { renderList } from './ElementPanelList.js';

export interface ElementPanelApi {
  getElement(): HTMLElement;
  dispose(): void;
}

export function createElementPanel(
  container: HTMLElement,
  sceneManager: SceneManager,
  controlFolder: FolderApi,
  transformGizmo?: TransformGizmoApi,
): ElementPanelApi {
  const panel = document.createElement('div');
  panel.id = 'elements-panel';
  container.appendChild(panel);

  const listPane = new Pane({ container: panel, title: 'Elements' });
  const renderer = createElementRenderer(sceneManager);
  const controls = createElementControls(controlFolder);
  let state = load();
  let selectedId: string | undefined;
  renderer.sync(state);

  const elementsFolder = listPane.addFolder({ title: 'Scene', expanded: true });

  function onRemove(id: string): void {
    selectedId = undefined;
    controls.clear();
    renderer.setSelected(undefined);
    transformGizmo?.detach();
    state = removeElement(state, id);
    save(state);
    renderer.sync(state);
    renderList(state, elementsFolder, () => selectedId, onSelect, onRemove);
  }

  function onSelect(element: SceneElement): void {
    selectedId = element.id;
    panel.querySelectorAll<HTMLElement>('[data-element-id]').forEach((el) => {
      el.setAttribute('aria-selected', String(el.dataset['elementId'] === element.id));
    });
    panel.querySelectorAll<HTMLButtonElement>('[data-remove-for]').forEach((btn) => {
      btn.hidden = btn.dataset['removeFor'] !== element.id;
    });
    renderer.setSelected(element.id);
    const mesh = sceneManager.getObject(element.id);
    /* v8 ignore start */
    if (mesh !== undefined) transformGizmo?.attach(mesh);
    /* v8 ignore stop */
    controls.bind(element, (updated) => {
      commit(updateElement(state, updated));
    });
  }

  if (transformGizmo !== undefined) {
    const gizmo = transformGizmo;
    gizmo.onObjectChange(() => {
      const newElements = state.elements.map((el) => {
        const obj = sceneManager.getObject(el.id);
        /* v8 ignore start */
        if (obj === undefined) return el;
        /* v8 ignore stop */
        return {
          ...el,
          origin_attributes: el.origin_attributes.map((a) => {
            if (a.dimension_uri_key === 'position.x')
              return { ...a, dimension_uri_value: obj.position.x };
            if (a.dimension_uri_key === 'position.y')
              return { ...a, dimension_uri_value: obj.position.y };
            /* v8 ignore start */
            if (a.dimension_uri_key === 'position.z')
              return { ...a, dimension_uri_value: obj.position.z };
            return a;
            /* v8 ignore stop */
          }),
        };
      });
      state = { elements: newElements };
      save(state);
    });
    gizmo.onDragEnd(() => {
      renderer.sync(state);
      if (selectedId !== undefined) {
        const mesh = sceneManager.getObject(selectedId);
        if (mesh !== undefined) {
          gizmo.attach(mesh);
          renderer.setSelected(selectedId);
        }
      }
    });
  }

  function commit(newState: ElementStoreData): void {
    state = newState;
    save(state);
    renderer.sync(state);
    renderList(state, elementsFolder, () => selectedId, onSelect, onRemove);
    if (transformGizmo !== undefined && selectedId !== undefined) {
      const mesh = sceneManager.getObject(selectedId);
      if (mesh !== undefined) {
        transformGizmo.attach(mesh);
        renderer.setSelected(selectedId);
      }
    }
  }

  renderList(state, elementsFolder, () => selectedId, onSelect, onRemove);

  const addBtn = listPane.addButton({ title: '+' });
  addBtn.element.id = 'elements-add-btn';

  const pickerFolder = listPane.addFolder({ title: 'Add Primitive', expanded: true });
  pickerFolder.element.id = 'elements-picker';
  pickerFolder.element.hidden = true;

  addBtn.element.addEventListener('click', () => {
    pickerFolder.element.hidden = !pickerFolder.element.hidden;
  });

  const types: readonly [string, () => SceneElement][] = [
    ['Box', createBox],
    ['Sphere', createSphere],
    ['Cylinder', createCylinder],
    ['Plane', createPlane],
  ];

  for (const [label, factory] of types) {
    pickerFolder.addButton({ title: label }).on('click', () => {
      commit(addElement(state, factory()));
      pickerFolder.element.hidden = true;
    });
  }

  return {
    getElement(): HTMLElement {
      return panel;
    },
    dispose(): void {
      controls.clear();
      listPane.dispose();
      container.removeChild(panel);
    },
  };
}
