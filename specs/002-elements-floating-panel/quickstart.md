# Quick-Start: Elements Floating Panel

**Feature**: `002-elements-floating-panel`
**Date**: 2026-04-30

This document describes how to integrate and test the modules introduced by this feature
from a developer's perspective — what to import, how to wire things together, and what
the expected outcomes look like.

---

## Prerequisites

- `pnpm install` has been run (includes `ulid` dependency).
- `pnpm dev` starts the Vite dev server.
- The Frameer 3D canvas and Tweakpane control pane are mounted in `index.html`.

---

## 1. Wiring in `main.ts`

```ts
import { applyTheme, loadSettings } from './system/SystemSettings.js';
import { createSystemPanel } from './system/SystemPanel.js';
import { createElementPanel } from './elements/index.js';

export function main(): void {
  // Apply theme before first render to prevent flash
  const settings = loadSettings();
  applyTheme(settings);

  // ... existing viewport + controlPane setup ...

  const transformGizmo = viewport.getTransformGizmo();
  scene.add(transformGizmo.getHelper()); // add gizmo visual once

  const elementFolder = controlPane.addFolder('Element');
  createElementPanel(viewportContainer, sceneManager, elementFolder, transformGizmo);

  createSystemPanel(settings, (theme) => {
    sceneManager.setBackground(theme === 'light' ? '#e8e8ec' : '#1a1a2e');
  });
}
```

---

## 2. Adding a Primitive

1. Open the **Elements** panel on the left edge of the viewport.
2. Click the **+** button at the **bottom** of the scene list.
3. A picker appears: `Box`, `Sphere`, `Cylinder`, `Plane`.
4. Click a type — the element appears in the list and in the 3D scene.

---

## 3. Selecting and Editing an Element

1. Click an element row in the Elements panel.
2. The row shows `aria-selected="true"` — a **×** button becomes visible on that row.
3. The 3D object is highlighted with a light-blue BackSide outline.
4. The **Element** folder in the control pane (right side) populates with:
   - **Name** — editable text for the element label.
   - Parametric attributes (dimensions, color) — live-edit controls.
   - Fixed attributes (geometry type) — read-only monitors.
5. A **TransformControls gizmo** appears on the 3D object.
   - Default mode: `translate` (arrows for each axis).
   - Use keyboard shortcuts or UI buttons (planned) to switch to `rotate` / `scale`.

---

## 4. Renaming an Element

1. Select an element (step 3 above).
2. In the **Element** folder, edit the **Name** field.
3. The element row label in the Elements panel updates immediately.
4. The new label persists in `localStorage`.

---

## 5. Changing an Element's Color

1. Select an element.
2. In the **Element** folder, find the **material.color** binding (color picker).
3. Pick a new color — the 3D mesh updates in real-time.

---

## 6. Removing an Element

1. Select an element — the **×** button appears on the row.
2. Click **×** — the element is removed from the list, the 3D mesh disappears, and the
   control pane is cleared.

---

## 7. Moving an Element with the Transform Gizmo

1. Select an element — the TransformControls gizmo appears.
2. Drag an axis arrow to translate the object.
3. While dragging, `OrbitControls` is automatically disabled (no camera rotation).
4. Releasing the drag updates `origin_attributes` in `localStorage`.

---

## 8. Switching the Theme

1. A **System** panel appears in the bottom-left corner.
2. Use the **Theme** dropdown to switch between `dark` (default) and `light`.
3. Toggle **Follow system** to automatically match the OS `prefers-color-scheme`.
4. Settings persist across page reloads via `localStorage`.

---

## 9. Running Tests

```bash
pnpm test            # all unit tests + inline doctests
pnpm test:coverage   # coverage report (≥ 98% required)
pnpm typecheck       # TypeScript strict type check
pnpm lint            # ESLint (zero warnings)
```

---

## 10. File Layout Reference

| File | Responsibility |
|------|----------------|
| `src/elements/ElementTypes.ts` | Shared types — no logic |
| `src/elements/ElementStore.ts` | Pure data mutations + localStorage |
| `src/elements/PrimitiveFactory.ts` | Element creators (Box/Sphere/Cylinder/Plane) |
| `src/elements/SelectionHighlight.ts` | BackSide outline for selected object |
| `src/elements/ElementRenderer.ts` | Three.js scene ↔ store sync + color + highlight |
| `src/elements/ElementControls.ts` | Tweakpane ↔ store bindings + label edit |
| `src/elements/ElementPanel.ts` | Floating panel DOM + event coordination |
| `src/scene/TransformGizmo.ts` | TransformControls wrapper |
| `src/system/SystemSettings.ts` | Theme store + DOM applier |
| `src/system/SystemPanel.ts` | Bottom-left settings panel |
| `src/viewport/Viewport.ts` | Creates TransformGizmo, exposes `getTransformGizmo()` |
