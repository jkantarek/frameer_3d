import type { FolderApi } from 'tweakpane';
import type { ElementStoreData, SceneElement } from './ElementTypes.js';

export function buildElementItem(
  el: SceneElement,
  depth: number,
  folder: FolderApi,
  getSelected: () => string | undefined,
  onSelect: (element: SceneElement) => void,
  onRemove: (id: string) => void,
): void {
  const btn = folder.addButton({ title: el.label });
  btn.element.dataset['elementId'] = el.id;
  btn.element.dataset['depth'] = String(depth);
  btn.element.setAttribute('aria-selected', String(el.id === getSelected()));
  btn.element.addEventListener('click', () => {
    onSelect(el);
  });
  const removeBtn = document.createElement('button');
  removeBtn.dataset['removeFor'] = el.id;
  removeBtn.textContent = '×';
  removeBtn.hidden = true;
  removeBtn.addEventListener('click', () => {
    onRemove(el.id);
  });
  btn.element.after(removeBtn);
  for (const child of el.child_elements) {
    buildElementItem(child, depth + 1, folder, getSelected, onSelect, onRemove);
  }
}

export function renderList(
  state: ElementStoreData,
  folder: FolderApi,
  getSelected: () => string | undefined,
  onSelect: (element: SceneElement) => void,
  onRemove: (id: string) => void,
): void {
  [...folder.children].forEach((b) => {
    b.dispose();
  });
  for (const el of state.elements) {
    buildElementItem(el, 0, folder, getSelected, onSelect, onRemove);
  }
}
