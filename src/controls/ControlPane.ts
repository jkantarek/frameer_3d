import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import type { LayoutState } from '../layout/LayoutState.js';
import { saveLayoutState } from '../layout/LayoutState.js';

export interface ControlPaneApi {
  readonly pane: Pane;
  addFolder(title: string): FolderApi;
  dispose(): void;
}

export function createControlPane(container: HTMLElement, state: LayoutState): ControlPaneApi {
  const pane = new Pane({ container, title: 'Controls' });
  pane.registerPlugin(EssentialsPlugin);
  pane.expanded = !state.paneCollapsed;
  if (state.paneCollapsed) {
    container.dataset['collapsed'] = 'true';
  }

  pane.on('fold', (ev): void => {
    state.paneCollapsed = !ev.expanded;
    container.dataset['collapsed'] = String(state.paneCollapsed);
    saveLayoutState(state);
  });

  return {
    pane,
    addFolder(title: string): FolderApi {
      return pane.addFolder({ title });
    },
    dispose(): void {
      pane.dispose();
    },
  };
}
