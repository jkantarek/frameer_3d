import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDragHandle } from './DragHandle.js';

const STORAGE_KEY = 'frameer3d.v1.layout';

class FakePointerEvent extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}

function fire(el: HTMLElement, type: string, init: PointerEventInit = {}): void {
  el.dispatchEvent(new PointerEvent(type, { pointerId: 1, bubbles: true, ...init }));
}

function makeSetup(): { handleEl: HTMLElement; paneEl: HTMLElement } {
  const handleEl = document.createElement('div');
  const paneEl = document.createElement('div');
  handleEl.setPointerCapture = (): void => {
    return;
  };
  return { handleEl, paneEl };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('PointerEvent', FakePointerEvent);
  Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createDragHandle — pointer drag edge cases', () => {
  it('pointerdown with non-primary button is ignored', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    fire(handleEl, 'pointerdown', { clientX: 100, button: 2 });
    fire(handleEl, 'pointermove', { clientX: 200 });
    expect(paneEl.style.getPropertyValue('--pane-width')).toBe('');
    expect(state.paneWidth).toBe(300);
  });

  it('pointercancel resets drag so pointermove no longer updates width', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    fire(handleEl, 'pointerdown', { clientX: 100, button: 0 });
    fire(handleEl, 'pointercancel');
    fire(handleEl, 'pointermove', { clientX: 200 });
    expect(paneEl.style.getPropertyValue('--pane-width')).toBe('');
    expect(state.paneWidth).toBe(300);
  });

  it('dispose() removes pointer listeners so drag no longer works', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    const dh = createDragHandle(handleEl, paneEl, state);
    dh.dispose();
    fire(handleEl, 'pointerdown', { clientX: 100, button: 0 });
    fire(handleEl, 'pointermove', { clientX: 200 });
    expect(paneEl.style.getPropertyValue('--pane-width')).toBe('');
    expect(state.paneWidth).toBe(300);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('createDragHandle — ARIA attributes', () => {
  it('sets role="separator", aria-orientation="vertical", aria-valuenow on init', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    expect(handleEl.getAttribute('role')).toBe('separator');
    expect(handleEl.getAttribute('aria-orientation')).toBe('vertical');
    expect(handleEl.getAttribute('aria-valuenow')).toBe('300');
  });

  it('aria-valuenow updates to new clamped width after drag', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    fire(handleEl, 'pointerdown', { clientX: 0, button: 0 });
    fire(handleEl, 'pointermove', { clientX: 80 });
    expect(handleEl.getAttribute('aria-valuenow')).toBe('380');
  });
});
