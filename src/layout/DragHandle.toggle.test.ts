import { beforeEach, describe, expect, it } from 'vitest';
import { createToggleButton } from './DragHandle.js';

const STORAGE_KEY = 'frameer3d.v1.layout';

function makeSetup(): { paneEl: HTMLElement; toggleEl: HTMLButtonElement } {
  return {
    paneEl: document.createElement('div'),
    toggleEl: document.createElement('button'),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('createToggleButton — toggle collapse', () => {
  it('click sets paneCollapsed to true and data-collapsed="true" on paneEl', () => {
    const { paneEl, toggleEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createToggleButton(toggleEl, paneEl, state);
    toggleEl.click();
    expect(state.paneCollapsed).toBe(true);
    expect(paneEl.dataset['collapsed']).toBe('true');
  });

  it('second click reverts paneCollapsed to false', () => {
    const { paneEl, toggleEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createToggleButton(toggleEl, paneEl, state);
    toggleEl.click();
    toggleEl.click();
    expect(state.paneCollapsed).toBe(false);
    expect(paneEl.dataset['collapsed']).toBe('false');
  });

  it('saveLayoutState is called after toggle (verified via localStorage)', () => {
    const { paneEl, toggleEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createToggleButton(toggleEl, paneEl, state);
    toggleEl.click();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown;
    expect(saved).toMatchObject({ paneCollapsed: true });
  });

  it('saveLayoutState called again after second toggle', () => {
    const { paneEl, toggleEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createToggleButton(toggleEl, paneEl, state);
    toggleEl.click();
    toggleEl.click();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown;
    expect(saved).toMatchObject({ paneCollapsed: false });
  });

  it('dispose() prevents toggle from working', () => {
    const { paneEl, toggleEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    const tb = createToggleButton(toggleEl, paneEl, state);
    tb.dispose();
    toggleEl.click();
    expect(state.paneCollapsed).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('createToggleButton — ARIA attributes', () => {
  it('sets aria-expanded="false" and aria-label when paneCollapsed is false', () => {
    const { paneEl, toggleEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createToggleButton(toggleEl, paneEl, state);
    expect(toggleEl.getAttribute('aria-expanded')).toBe('false');
    expect(toggleEl.getAttribute('aria-label')).toBe('Toggle control pane');
  });

  it('sets aria-expanded="true" initially when paneCollapsed is true', () => {
    const { paneEl, toggleEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: true };
    createToggleButton(toggleEl, paneEl, state);
    expect(toggleEl.getAttribute('aria-expanded')).toBe('true');
  });

  it('aria-expanded updates to "true" after click (pane collapses)', () => {
    const { paneEl, toggleEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createToggleButton(toggleEl, paneEl, state);
    toggleEl.click();
    expect(toggleEl.getAttribute('aria-expanded')).toBe('true');
  });

  it('aria-expanded updates back to "false" after second click', () => {
    const { paneEl, toggleEl } = makeSetup();
    const state = { paneWidth: 300, paneCollapsed: false };
    createToggleButton(toggleEl, paneEl, state);
    toggleEl.click();
    toggleEl.click();
    expect(toggleEl.getAttribute('aria-expanded')).toBe('false');
  });
});
