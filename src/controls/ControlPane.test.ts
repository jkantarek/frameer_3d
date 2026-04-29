import { beforeEach, describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';
import { createControlPane } from './ControlPane.js';

const STORAGE_KEY = 'frameer3d.v1.layout';
const defaultState = (): { paneWidth: number; paneCollapsed: boolean } => ({
  paneWidth: 300,
  paneCollapsed: false,
});

beforeEach(() => {
  localStorage.clear();
});

describe('createControlPane — init', () => {
  it('returns object with pane, addFolder, and dispose', () => {
    const container = document.createElement('div');
    const cp = createControlPane(container, defaultState());
    expect(cp.pane).toBeInstanceOf(Pane);
    expect(typeof cp.addFolder).toBe('function');
    expect(typeof cp.dispose).toBe('function');
    cp.dispose();
  });

  it('does not throw when called in jsdom', () => {
    expect(() => {
      createControlPane(document.createElement('div'), defaultState()).dispose();
    }).not.toThrow();
  });

  it('addFolder returns a FolderApi with addFolder method', () => {
    const cp = createControlPane(document.createElement('div'), defaultState());
    const folder = cp.addFolder('My Section');
    expect(typeof folder.addFolder).toBe('function');
    cp.dispose();
  });

  it('dispose() removes pane element from the container', () => {
    const container = document.createElement('div');
    const cp = createControlPane(container, defaultState());
    expect(container.children.length).toBeGreaterThan(0);
    cp.dispose();
    expect(container.children.length).toBe(0);
  });

  it('sets pane.expanded=false and data-collapsed when paneCollapsed=true', () => {
    const container = document.createElement('div');
    const cp = createControlPane(container, { paneWidth: 300, paneCollapsed: true });
    expect(cp.pane.expanded).toBe(false);
    expect(container.dataset['collapsed']).toBe('true');
    cp.dispose();
  });

  it('leaves pane.expanded=true and no data-collapsed when paneCollapsed=false', () => {
    const container = document.createElement('div');
    const cp = createControlPane(container, defaultState());
    expect(cp.pane.expanded).toBe(true);
    expect(container.dataset['collapsed']).toBeUndefined();
    cp.dispose();
  });
});

describe('createControlPane — fold sync', () => {
  it('fold to collapsed updates state, container, and localStorage', () => {
    const container = document.createElement('div');
    const state = defaultState();
    const cp = createControlPane(container, state);
    cp.pane.expanded = false;
    expect(state.paneCollapsed).toBe(true);
    expect(container.dataset['collapsed']).toBe('true');
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown;
    expect(saved).toMatchObject({ paneCollapsed: true });
    cp.dispose();
  });

  it('fold back to expanded updates state and container', () => {
    const container = document.createElement('div');
    const state = defaultState();
    const cp = createControlPane(container, state);
    cp.pane.expanded = false;
    cp.pane.expanded = true;
    expect(state.paneCollapsed).toBe(false);
    expect(container.dataset['collapsed']).toBe('false');
    cp.dispose();
  });
});
