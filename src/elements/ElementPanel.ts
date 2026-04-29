import type { FolderApi } from 'tweakpane';
import type { SceneManager } from '../scene/SceneManager.js';
import type { ElementStoreData, SceneElement } from './ElementTypes.js';
import { load, save, addElement, updateElement } from './ElementStore.js';
import { createElementRenderer } from './ElementRenderer.js';
import { createElementControls } from './ElementControls.js';
import { createBox, createSphere, createCylinder } from './PrimitiveFactory.js';

export interface ElementPanelApi {
  getElement(): HTMLElement;
  dispose(): void;
}

function appendElements(
  elements: readonly SceneElement[],
  depth: number,
  listEl: HTMLUListElement,
  selectedId: string | undefined,
  onSelect: (element: SceneElement) => void,
): void {
  for (const el of elements) {
    const li = document.createElement('li');
    li.dataset.id = el.id;
    li.dataset.depth = String(depth);
    li.textContent = el.label;
    li.setAttribute('aria-selected', String(el.id === selectedId));
    li.addEventListener('click', () => {
      onSelect(el);
    });
    listEl.appendChild(li);
    appendElements(el.child_elements, depth + 1, listEl, selectedId, onSelect);
  }
}

function renderList(
  state: ElementStoreData,
  listEl: HTMLUListElement,
  selectedId: string | undefined,
  onSelect: (element: SceneElement) => void,
): void {
  listEl.innerHTML = '';
  appendElements(state.elements, 0, listEl, selectedId, onSelect);
}

export function createElementPanel(
  container: HTMLElement,
  sceneManager: SceneManager,
  controlFolder: FolderApi,
): ElementPanelApi {
  const panel = document.createElement('div');
  panel.id = 'elements-panel';
  container.appendChild(panel);

  const renderer = createElementRenderer(sceneManager);
  const controls = createElementControls(controlFolder);
  let state = load();
  let selectedId: string | undefined;
  renderer.sync(state);

  const listEl = document.createElement('ul');
  listEl.id = 'elements-list';
  panel.appendChild(listEl);

  function onSelect(element: SceneElement): void {
    selectedId = element.id;
    listEl.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
      li.setAttribute('aria-selected', String(li.dataset.id === element.id));
    });
    controls.bind(element, (updated) => {
      commit(updateElement(state, updated));
    });
  }

  renderList(state, listEl, selectedId, onSelect);

  function commit(newState: ElementStoreData): void {
    state = newState;
    save(state);
    renderer.sync(state);
    renderList(state, listEl, selectedId, onSelect);
  }

  const addBtn = document.createElement('button');
  addBtn.id = 'elements-add-btn';
  addBtn.textContent = '+';
  panel.appendChild(addBtn);

  const picker = document.createElement('div');
  picker.id = 'elements-picker';
  picker.hidden = true;
  panel.appendChild(picker);

  const types: readonly [string, () => SceneElement][] = [
    ['Box', createBox],
    ['Sphere', createSphere],
    ['Cylinder', createCylinder],
  ];

  for (const [label, factory] of types) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      commit(addElement(state, factory()));
      picker.hidden = true;
    });
    picker.appendChild(btn);
  }

  addBtn.addEventListener('click', () => {
    picker.hidden = !picker.hidden;
  });

  return {
    getElement(): HTMLElement {
      return panel;
    },
    dispose(): void {
      controls.clear();
      container.removeChild(panel);
    },
  };
}
