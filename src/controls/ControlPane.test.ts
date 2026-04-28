import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';
import { createControlPane } from './ControlPane.js';

describe('createControlPane', () => {
  it('returns object with pane, addFolder, and dispose', () => {
    const container = document.createElement('div');
    const cp = createControlPane(container);
    expect(cp.pane).toBeInstanceOf(Pane);
    expect(typeof cp.addFolder).toBe('function');
    expect(typeof cp.dispose).toBe('function');
    cp.dispose();
  });

  it('does not throw when called in jsdom', () => {
    expect(() => {
      createControlPane(document.createElement('div')).dispose();
    }).not.toThrow();
  });

  it('addFolder returns a FolderApi with addFolder method', () => {
    const cp = createControlPane(document.createElement('div'));
    const folder = cp.addFolder('My Section');
    expect(typeof folder.addFolder).toBe('function');
    cp.dispose();
  });

  it('dispose() removes pane element from the container', () => {
    const container = document.createElement('div');
    const cp = createControlPane(container);
    expect(container.children.length).toBeGreaterThan(0);
    cp.dispose();
    expect(container.children.length).toBe(0);
  });
});
