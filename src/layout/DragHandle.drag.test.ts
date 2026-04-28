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

describe('createDragHandle — pointer drag', () => {
  it('positive delta on pointermove increases --pane-width', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    fire(handleEl, 'pointerdown', { clientX: 100, button: 0 });
    fire(handleEl, 'pointermove', { clientX: 150 });
    expect(paneEl.style.getPropertyValue('--pane-width')).toBe('350px');
    expect(state.paneWidth).toBe(350);
  });

  it('negative delta on pointermove decreases --pane-width', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    fire(handleEl, 'pointerdown', { clientX: 100, button: 0 });
    fire(handleEl, 'pointermove', { clientX: 50 });
    expect(paneEl.style.getPropertyValue('--pane-width')).toBe('250px');
    expect(state.paneWidth).toBe(250);
  });

  it('clamps width to minimum 200px', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    fire(handleEl, 'pointerdown', { clientX: 300, button: 0 });
    fire(handleEl, 'pointermove', { clientX: 0 });
    expect(paneEl.style.getPropertyValue('--pane-width')).toBe('200px');
    expect(state.paneWidth).toBe(200);
  });

  it('clamps width to maximum window.innerWidth * 0.5', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    fire(handleEl, 'pointerdown', { clientX: 0, button: 0 });
    fire(handleEl, 'pointermove', { clientX: 10000 });
    expect(paneEl.style.getPropertyValue('--pane-width')).toBe('600px');
    expect(state.paneWidth).toBe(600);
  });

  it('localStorage unchanged after pointermove but saved after pointerup', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    fire(handleEl, 'pointerdown', { clientX: 100, button: 0 });
    fire(handleEl, 'pointermove', { clientX: 150 });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    fire(handleEl, 'pointerup');
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown;
    expect(saved).toMatchObject({ paneWidth: 350 });
  });

  it('pointermove/pointerup without pointerdown do not change state or save', () => {
    const { handleEl, paneEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createDragHandle(handleEl, paneEl, state);
    fire(handleEl, 'pointermove', { clientX: 150 });
    fire(handleEl, 'pointerup');
    expect(paneEl.style.getPropertyValue('--pane-width')).toBe('');
    expect(state.paneWidth).toBe(300);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
