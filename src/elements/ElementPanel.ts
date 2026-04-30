import type { FolderApi } from 'tweakpane';
import { Pane } from 'tweakpane';
import type { SceneManager } from '../scene/SceneManager.js';
import type { ElementStoreData, SceneElement } from './ElementTypes.js';
import { load, save, addElement, removeElement, updateElement } from './ElementStore.js';
import { createElementRenderer } from './ElementRenderer.js';
import { createElementControls } from './ElementControls.js';
import { createBox, createSphere, createCylinder } from './PrimitiveFactory.js';

export interface ElementPanelApi {
  getElement(): HTMLElement;
  dispose(): void;
}

function buildElementItem(
  el: SceneElement,
  depth: number,
  folder: FolderApi,
  getSelected: () => string | undefined,
  onSelect: (element: SceneElement) => void,
): void {
  const btn = folder.addButton({ title: el.label });
  btn.element.dataset.elementId = el.id;
  btn.element.dataset.depth = String(depth);
  btn.element.setAttribute('aria-selected', String(el.id === getSelected()));
  btn.element.addEventListener('click', () => {
    onSelect(el);
  });
  for (const child of el.child_elements) {
    buildElementItem(child, depth + 1, folder, getSelected, onSelect);
  }
}

function renderList(
  state: ElementStoreData,
  folder: FolderApi,
  getSelected: () => string | undefined,
  onSelect: (element: SceneElement) => void,
): void {
  [...folder.children].forEach((b) => {
    b.dispose();
  });
  for (const el of state.elements) {
    buildElementItem(el, 0, folder, getSelected, onSelect);
  }
}

export function createElementPanel(
  container: HTMLElement,
  sceneManager: SceneManager,
  controlFolder: FolderApi,
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
  ];

  for (const [label, factory] of types) {
    pickerFolder.addButton({ title: label }).on('click', () => {
      commit(addElement(state, factory()));
      pickerFolder.element.hidden = true;
    });
  }

  const elementsFolder = listPane.addFolder({ title: 'Scene', expanded: true });

  function onSelect(element: SceneElement): void {
    selectedId = element.id;
    panel.querySelectorAll<HTMLElement>('[data-element-id]').forEach((el) => {
      el.setAttribute('aria-selected', String(el.dataset.elementId === element.id));
    });
    controls.bind(element, (updated) => {
      commit(updateElement(state, updated));
    });
  }

  function commit(newState: ElementStoreData): void {
    state = newState;
    save(state);
    renderer.sync(state);
    renderList(state, elementsFolder, () => selectedId, onSelect);
  }

  renderList(state, elementsFolder, () => selectedId, onSelect);

  const removeBtn = listPane.addButton({ title: 'Remove' });
  removeBtn.element.id = 'elements-remove-btn';
  removeBtn.element.addEventListener('click', () => {
    if (selectedId !== undefined) {
      const id = selectedId;
      selectedId = undefined;
      controls.clear();
      commit(removeElement(state, id));
    }
  });

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
