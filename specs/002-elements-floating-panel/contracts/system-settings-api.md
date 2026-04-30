# Contract: System Settings API

**Feature**: `002-elements-floating-panel`
**Date**: 2026-04-30

This document defines the public API contracts for the `src/system/` domain —
theme management and OS preference passthrough.

---

## 1. `SystemSettings` (exported from `src/system/SystemSettings.ts`)

Pure-data module for reading, writing, and applying the application theme.
No Tweakpane or Three.js imports.

```ts
// Theme values
export type ThemeValue = 'dark' | 'light';

// Persisted settings schema (localStorage key: 'frameer3d.v1.settings')
export interface SystemSettingsData {
  readonly theme: ThemeValue;
  readonly followSystem: boolean;
}

// Load from localStorage; returns { theme: 'dark', followSystem: false } on failure
export function loadSettings(): SystemSettingsData;

// Persist to localStorage; silently handles QuotaExceededError
export function saveSettings(data: SystemSettingsData): void;

// Apply the theme by setting document.documentElement.dataset['theme']
// Must be called early in main.ts to prevent flash
export function applyTheme(data: SystemSettingsData): void;

// Read the OS preference via window.matchMedia('(prefers-color-scheme: dark)')
// Returns 'dark' or 'light'; defaults to 'dark' when matchMedia is unavailable
export function detectSystemTheme(): ThemeValue;
```

**Side effects**:
- `applyTheme` modifies `document.documentElement.dataset['theme']` — the only allowed
  DOM mutation in this module.
- All other functions are pure (localStorage reads/writes are the only I/O).

---

## 2. `SystemPanel` (exported from `src/system/SystemPanel.ts`)

Tweakpane panel fixed to the bottom-left corner of the viewport.

```ts
export interface SystemPanelApi {
  // Dispose the Tweakpane pane and remove all event listeners
  dispose(): void;
}

// Mount the system settings panel.
// initialSettings: current settings (already applied to DOM by applyTheme).
// onThemeChange: optional callback fired after every theme change
//   (e.g., to update SceneManager background color in main.ts).
export function createSystemPanel(
  initialSettings: SystemSettingsData,
  onThemeChange?: (theme: ThemeValue) => void,
): SystemPanelApi;
```

**UI behaviour**:
- Panel title: `"System"`.
- Contains two bindings:
  1. `Theme` — list selector: `{ dark: 'dark', light: 'light' }`.
     Disabled (greyed) when `followSystem` is `true`.
  2. `Follow system` — checkbox.
     When toggled `true`, immediately calls `detectSystemTheme()`, applies the result,
     and registers a `matchMedia` `'change'` listener.
     When toggled `false`, removes the `matchMedia` listener and restores manual control.
- On any change: calls `saveSettings(data)` and `applyTheme(data)`.
- Fires `onThemeChange(theme)` after every applied change so callers can react
  (e.g., update the Three.js scene background colour).

---

## 3. CSS Contract

CSS custom properties that must be defined in `src/style.css`:

```css
:root {
  --bg: #1a1a2e;
  --fg: #e8e8e8;
  --panel-bg: #16213e;
  --panel-border: #0f3460;
  --accent: #00aaff;
}

[data-theme="light"] {
  --bg: #f4f4f4;
  --fg: #1a1a1a;
  --panel-bg: #ffffff;
  --panel-border: #cccccc;
  --accent: #0066cc;
}
```

The Three.js scene background responds to theme via `onThemeChange`:
- `'dark'` → `sceneManager.setBackground('#1a1a2e')`
- `'light'` → `sceneManager.setBackground('#e8e8ec')`

---

## 4. `Viewport` API extension

`ViewportApi` is extended with:

```ts
export interface ViewportApi {
  getCamera(): THREE.PerspectiveCamera;
  getSceneManager(): SceneManager;
  getTransformGizmo(): TransformGizmoApi;  // NEW
  dispose(): void;
}
```

---

## 5. `TransformGizmo` (exported from `src/scene/TransformGizmo.ts`)

```ts
export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface TransformGizmoApi {
  // Attach gizmo to the given object; makes the visual helper visible
  attach(object: THREE.Object3D): void;

  // Detach gizmo; hides the visual helper
  detach(): void;

  // Switch between translate / rotate / scale modes
  setMode(mode: TransformMode): void;

  // Return the visual gizmo Object3D; add to scene once at startup
  getHelper(): THREE.Object3D;

  // Register a callback fired on every objectChange event during drag
  onObjectChange(cb: (object: THREE.Object3D) => void): void;

  // Register a callback fired when a drag ends (mouseUp)
  onDragEnd(cb: () => void): void;

  // Remove all event listeners and dispose the TransformControls instance
  dispose(): void;
}

// Factory: takes camera, renderer domElement, and OrbitControls instance
// Internally wires dragging-changed → orbitControls.enabled toggle
export function createTransformGizmo(
  camera: THREE.Camera,
  domElement: HTMLElement,
  orbitControls: { enabled: boolean },
): TransformGizmoApi;
```
