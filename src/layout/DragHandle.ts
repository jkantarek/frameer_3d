import { clamp } from '../utils/math.js';
import type { LayoutState } from './LayoutState.js';
import { saveLayoutState } from './LayoutState.js';

export function createDragHandle(
  handleEl: HTMLElement,
  paneEl: HTMLElement,
  state: LayoutState,
): { dispose(): void } {
  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  handleEl.setAttribute('role', 'separator');
  handleEl.setAttribute('aria-orientation', 'vertical');
  handleEl.setAttribute('aria-valuenow', String(state.paneWidth));

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    isDragging = true;
    startX = event.clientX;
    startWidth = state.paneWidth;
    handleEl.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    const maxWidth = Math.max(200, window.innerWidth * 0.5);
    const newWidth = clamp(startWidth + delta, 200, maxWidth);
    state.paneWidth = newWidth;
    paneEl.style.setProperty('--pane-width', String(newWidth) + 'px');
    handleEl.setAttribute('aria-valuenow', String(newWidth));
  }

  function onPointerUp(): void {
    if (!isDragging) return;
    isDragging = false;
    saveLayoutState(state);
  }

  function onPointerCancel(): void {
    isDragging = false;
  }

  handleEl.addEventListener('pointerdown', onPointerDown);
  handleEl.addEventListener('pointermove', onPointerMove);
  handleEl.addEventListener('pointerup', onPointerUp);
  handleEl.addEventListener('pointercancel', onPointerCancel);

  return {
    dispose(): void {
      handleEl.removeEventListener('pointerdown', onPointerDown);
      handleEl.removeEventListener('pointermove', onPointerMove);
      handleEl.removeEventListener('pointerup', onPointerUp);
      handleEl.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}

export function createToggleButton(
  toggleEl: HTMLButtonElement,
  paneEl: HTMLElement,
  state: LayoutState,
): { dispose(): void } {
  toggleEl.setAttribute('aria-expanded', String(state.paneCollapsed));
  toggleEl.setAttribute('aria-label', 'Toggle control pane');

  function onClick(): void {
    state.paneCollapsed = !state.paneCollapsed;
    paneEl.dataset['collapsed'] = String(state.paneCollapsed);
    toggleEl.setAttribute('aria-expanded', String(state.paneCollapsed));
    saveLayoutState(state);
  }

  toggleEl.addEventListener('click', onClick);

  return {
    dispose(): void {
      toggleEl.removeEventListener('click', onClick);
    },
  };
}
