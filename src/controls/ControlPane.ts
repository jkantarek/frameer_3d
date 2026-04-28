import { Pane } from 'tweakpane';
import type { FolderApi } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

export interface ControlPaneApi {
  readonly pane: Pane;
  addFolder(title: string): FolderApi;
  dispose(): void;
}

export function createControlPane(container: HTMLElement): ControlPaneApi {
  const pane = new Pane({ container });
  pane.registerPlugin(EssentialsPlugin);

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
