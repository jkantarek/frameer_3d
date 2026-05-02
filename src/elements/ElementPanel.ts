import type { FolderApi } from 'tweakpane';
import { Pane } from 'tweakpane';
import type { SceneManager } from '../scene/SceneManager.js';
import type { TransformGizmoApi } from '../scene/TransformGizmo.js';
import type { ElementStoreData, SceneElement } from './ElementTypes.js';
import { addElement, removeElement, updateElement } from './ElementStore.js';
import type { Project } from '../project/ProjectTypes.js';
import { loadProject, saveProject } from '../project/index.js';
import { createElementRenderer } from './ElementRenderer.js';
import { createElementControls } from './ElementControls.js';
import { createBox, createSphere, createCylinder, createPlane } from './PrimitiveFactory.js';
import { renderList } from './ElementPanelList.js';
import { applyObjTransform } from './ElementPanelSync.js';

export interface ElementPanelApi {
  getElement(): HTMLElement;
  dispose(): void;
}

function makeDefaultProject(id: string): Project {
  const now = new Date().toISOString();
  return { id, name: 'Untitled Project', created_at: now, updated_at: now, elements: [] };
}

export function createElementPanel(
  container: HTMLElement,
  sceneManager: SceneManager,
  controlFolder: FolderApi,
  projectId: string,
  transformGizmo?: TransformGizmoApi,
): ElementPanelApi {
  const panel = document.createElement('div');
  panel.id = 'elements-panel';
  container.appendChild(panel);

  const listPane = new Pane({ container: panel, title: 'Elements' });
  const renderer = createElementRenderer(sceneManager);
  const controls = createElementControls(controlFolder);
  const project = loadProject(projectId) ?? makeDefaultProject(projectId);
  let state: ElementStoreData = { elements: project.elements };
  let selectedId: string | undefined;
  renderer.sync(state);

  const elementsFolder = listPane.addFolder({ title: 'Scene', expanded: true });

  function onRemove(id: string): void {
    selectedId = undefined;
    controls.clear();
    renderer.setSelected(undefined);
    transformGizmo?.detach();
    commit(removeElement(state, id));
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
        return applyObjTransform(el, obj);
      });
      state = { elements: newElements };
      saveProject({ ...project, elements: state.elements, updated_at: new Date().toISOString() });
    });
    gizmo.onDragEnd(() => {
      renderer.sync(state);
      if (selectedId !== undefined) {
        const mesh = sceneManager.getObject(selectedId);
        if (mesh !== undefined) {
          gizmo.attach(mesh);
          renderer.setSelected(selectedId);
        }
        const updatedEl = state.elements.find((el) => el.id === selectedId);
        if (updatedEl !== undefined) {
          controls.bind(updatedEl, (updated) => {
            commit(updateElement(state, updated));
          });
        }
      }
    });
  }

  function commit(newState: ElementStoreData): void {
    state = newState;
    saveProject({ ...project, elements: state.elements, updated_at: new Date().toISOString() });
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
