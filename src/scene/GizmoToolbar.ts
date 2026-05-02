import type { TransformGizmoApi, TransformMode } from './TransformGizmo.js';

export interface GizmoToolbarApi {
  setActiveMode(mode: TransformMode): void;
  dispose(): void;
}

const MODES: readonly TransformMode[] = ['translate', 'rotate', 'scale'];

function modeLabel(mode: TransformMode): string {
  if (mode === 'translate') return 'Move';
  if (mode === 'rotate') return 'Rotate';
  return 'Scale';
}

export function createGizmoToolbar(
  container: HTMLElement,
  gizmo: TransformGizmoApi,
): GizmoToolbarApi {
  const div = document.createElement('div');
  div.id = 'gizmo-toolbar';
  div.setAttribute('role', 'toolbar');
  div.setAttribute('aria-label', 'Transform mode');
  div.style.cssText =
    'position:absolute;bottom:1rem;left:50%;transform:translateX(-50%);z-index:10';

  const buttons: HTMLButtonElement[] = [];

  for (const mode of MODES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-mode', mode);
    btn.setAttribute('aria-pressed', mode === 'translate' ? 'true' : 'false');
    btn.textContent = modeLabel(mode);
    btn.addEventListener('click', () => {
      gizmo.setMode(mode);
      updatePressed(mode);
    });
    buttons.push(btn);
    div.appendChild(btn);
  }

  container.appendChild(div);
  gizmo.setMode('translate');

  function updatePressed(mode: TransformMode): void {
    for (const btn of buttons) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-mode') === mode ? 'true' : 'false');
    }
  }

  return {
    setActiveMode: updatePressed,
    dispose(): void {
      div.remove();
    },
  };
}
