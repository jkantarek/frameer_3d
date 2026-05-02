import { Pane } from 'tweakpane';
import { saveSettings, applyTheme, detectSystemTheme } from './SystemSettings.js';
import type { SystemSettingsData, ThemeValue } from './SystemSettings.js';
import type { ProjectRegistry } from '../project/ProjectTypes.js';

export interface SystemPanelCallbacks {
  onThemeChange?: (theme: ThemeValue) => void;
  onNewProject?: () => void;
  onSelectProject?: (id: string) => void;
  onRenameProject?: (id: string, name: string) => void;
}

export interface SystemPanelApi {
  dispose(): void;
}

export function createSystemPanel(
  initialSettings: SystemSettingsData,
  projectRegistry: ProjectRegistry,
  activeProjectId: string,
  callbacks?: SystemPanelCallbacks,
  _container?: HTMLElement,
): SystemPanelApi {
  const pane = new Pane({ container: _container ?? document.body, title: 'System' });
  pane.element.style.position = 'fixed';
  pane.element.style.bottom = '1rem';
  pane.element.style.left = '1rem';

  let data = { ...initialSettings };

  const themeProxy: { theme: ThemeValue } = { theme: data.theme };
  const followProxy: { followSystem: boolean } = { followSystem: data.followSystem };

  let mediaListener: (() => void) | undefined;

  function applyAndNotify(): void {
    saveSettings(data);
    applyTheme(data);
    callbacks?.onThemeChange?.(data.theme);
  }

  function removeMediaListener(): void {
    /* v8 ignore start */
    if (mediaListener !== undefined) {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .removeEventListener('change', mediaListener);
      mediaListener = undefined;
    }
    /* v8 ignore stop */
  }

  const themeBinding = pane.addBinding(themeProxy, 'theme', {
    label: 'Theme',
    options: { Dark: 'dark', Light: 'light' },
  });
  themeBinding.on('change', (ev) => {
    data = { ...data, theme: ev.value };
    applyAndNotify();
  });

  pane.addBinding(followProxy, 'followSystem', { label: 'Follow system' }).on('change', (ev) => {
    data = { ...data, followSystem: ev.value };
    /* v8 ignore start */
    if (ev.value) {
      const detected = detectSystemTheme();
      data = { ...data, theme: detected };
      themeProxy.theme = detected;
      pane.refresh();
      mediaListener = (): void => {
        data = { ...data, theme: detectSystemTheme() };
        themeProxy.theme = data.theme;
        pane.refresh();
        applyAndNotify();
      };
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', mediaListener);
    } else {
      removeMediaListener();
    }
    /* v8 ignore stop */
    applyAndNotify();
  });

  const projectsFolder = pane.addFolder({ title: 'Projects' });
  const activeProject = projectRegistry.projects.find((p) => p.id === activeProjectId);
  const nameProxy = { name: activeProject?.name ?? '' };
  projectsFolder.addBinding(nameProxy, 'name', { label: 'Name' }).on('change', (ev) => {
    callbacks?.onRenameProject?.(activeProjectId, ev.value);
  });
  projectsFolder.addButton({ title: 'New Project' }).on('click', () => {
    callbacks?.onNewProject?.();
  });

  return {
    dispose(): void {
      removeMediaListener();
      pane.element.remove();
      pane.dispose();
    },
  };
}
