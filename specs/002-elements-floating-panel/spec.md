# Feature Spec: Elements Floating Panel

**Branch**: `002-elements-floating-panel`
**Date**: 2026-04-29
**Status**: Updated 2026-04-30

---

## Overview

Add a left-side floating **Elements** panel to the Frameer 3D shell. The panel shows a
hierarchical list of scene elements and provides a **+** button to add primitive shapes
(box, sphere, cylinder, plane). All element data is persisted in `localStorage` via a
centralized `ElementStore`. Rendering is always driven from the store — the UI and the
Three.js scene are both consumers of the same data object, never the source of truth.

Elements are identified by **ULIDs** (Universally Unique Lexicographically Sortable
Identifiers), which encode creation time so that chronological display order is natural
from a lexicographic sort without a separate timestamp field.

A system-settings panel in the bottom-left corner controls the application theme
(dark / light) and can follow the OS `prefers-color-scheme` preference automatically.

---

## Goals

1. Present a floating panel anchored to the left edge of the 3D viewport.
2. Panel shows a flat (initially) element list with recursive nesting support.
3. "**+**" button at the **bottom** of the scene list opens a primitive picker
   (box / sphere / cylinder / plane) and appends the new element to the store.
4. Each element row shows a **×** remove button, visible only while that row is selected.
5. Selecting an element binds its **parametric** and **fixed** attributes — plus its
   editable **label** and **material color** — directly into the Tweakpane control pane.
6. The `ElementStore` is the **single source of truth** — renderer, panel, and controls
   are all read-only consumers that react to store changes.
7. All element data is persisted in `localStorage` (key `frameer3d.v1.elements`).
8. Supports recursive nesting: any element can have `child_elements`, each following the
   same schema.
9. A **selection highlight** (double-mesh BackSide outline) marks the active 3D object.
10. A **transform gizmo** (Three.js TransformControls) appears on the selected object and
    supports translate / rotate / scale modes.
11. A bottom-left **System Settings** panel allows toggling dark / light theme and
    optionally following the OS `prefers-color-scheme` value.

---

## Non-Goals

- No drag-and-drop reordering.
- No undo/redo system.
- No import/export of element trees to JSON file.
- No real OpenCASCADE geometry generation in this feature — primitives rendered with
  Three.js geometry classes as stand-ins.
- No multi-selection.
- No face-selection "push/pull" modeling (CAD-style direct editing) — planned for a
  future feature spec.
- No placing a new element exactly on the face of an existing element — planned for a
  future feature spec.

---

## Requirements

### R1 — Elements Floating Panel

- Positioned as a CSS overlay anchored to the left edge of `#viewport-container`.
- Always visible (no collapse in v1); does not occlude the Tweakpane control pane.
- Shows a scrollable list of top-level elements; child elements indented under parents.
- Each row displays `label` and a selection indicator.
- Clicking a row selects that element and triggers control pane bindings (R5).
- A **×** remove button appears inline on each element row **only** when that row is
  selected (`aria-selected="true"`); hidden otherwise. Clicking it removes the element
  from the store, clears the control pane, and detaches the transform gizmo.
- "**+**" button is positioned at the **bottom** of the scene list (below all element
  rows). It opens an inline primitive-type picker: `Box`, `Sphere`, `Cylinder`, `Plane`.
- Picking a type creates a new `SceneElement` via `PrimitiveFactory` and writes it to
  `ElementStore`.

### R2 — Element Data Schema

LocalStorage key `frameer3d.v1.elements` stores:

```json
{
  "elements": [
    {
      "id": "<ULID>",
      "label": "string",
      "description": "string",
      "parametric_attributes": [
        {
          "id": "<ULID>",
          "attribute_uri_key": "string",
          "attribute_value": "string",
          "attribute_type": "number | string | boolean | color | select"
        }
      ],
      "fixed_attributes": [
        {
          "id": "<ULID>",
          "attribute_uri_key": "string",
          "attribute_value": "string"
        }
      ],
      "origin_attributes": [
        {
          "id": "<ULID>",
          "dimension_uri_key": "string",
          "dimension_uri_value": 0.0
        }
      ],
      "child_elements": ["<recursive SceneElement>"]
    }
  ]
}
```

`attribute_type` drives the Tweakpane binding type when an element is selected.
`origin_attributes` carry floating-point spatial dimensions (position, rotation, scale).

### R3 — ElementStore

- Singleton-per-app pure-data module (no Three.js or DOM imports).
- Public API:
  - `load(): ElementStoreData` — load from `localStorage` (with fallback to empty).
  - `save(data: ElementStoreData): void` — persist to `localStorage`.
  - `addElement(data: ElementStoreData, el: SceneElement): ElementStoreData` — pure.
  - `removeElement(data: ElementStoreData, id: string): ElementStoreData` — pure (deep).
  - `updateElement(data: ElementStoreData, updated: SceneElement): ElementStoreData` — pure (deep).
  - `findElement(data: ElementStoreData, id: string): SceneElement | undefined` — pure (deep).
- The store is **immutable-update** based: functions return new data objects rather than
  mutating state. Callers manage the reference and call `save` explicitly.
- Emitting change events is handled by the `ElementPanel` coordinator layer, not the
  store itself.

### R4 — ElementRenderer

- Subscribes to store changes via a callback registered in the coordinator.
- For each top-level and nested element, maps the element's `origin_attributes` to an
  `Object3D.position / rotation / scale` and the geometry type from `fixed_attributes`
  (`geometry.type` key).
- Reads `material.color` from `parametric_attributes` (type `color`) and applies it as
  the mesh material's hex color.
- Calls `SceneManager.addObject(el.id, mesh)` when an element is added.
- Calls `SceneManager.removeObject(el.id)` when an element is removed.
- On update: removes old mesh, adds rebuilt mesh.
- Manages a **selection outline**: when `setSelected(id)` is called, attaches a
  double-mesh BackSide outline as a child of the selected mesh; removes it when another
  element is selected or the selection is cleared.
- No awareness of panel UI or controls.

### R5 — ElementControls

- Activated when an element is selected in the panel.
- Clears all existing Tweakpane bindings in the "Element" folder.
- Adds an editable **Name** binding at the top (bound to `element.label`); on change,
  updates the element's label in the store, re-saves, and triggers panel list re-render.
- For each `parametric_attribute`: adds a Tweakpane binding keyed by
  `attribute_uri_key`, with type driven by `attribute_type` enum.
- For each `fixed_attribute`: adds a read-only Tweakpane monitor keyed by
  `attribute_uri_key`.
- On binding change: updates the element in the store, calls `save`, and triggers
  re-render.

### R6 — PrimitiveFactory

- `createBox(): SceneElement` — creates a box with default width/height/depth.
- `createSphere(): SceneElement` — creates a sphere with default radius.
- `createCylinder(): SceneElement` — creates a cylinder with default radius/height.
- `createPlane(): SceneElement` — creates a flat plane with default width/height; uses
  `THREE.PlaneGeometry` with `DoubleSide` material so it is visible from both sides.
- Each primitive pre-populates:
  - `parametric_attributes` — dimensions + `material.color` (default `"#888888"`)
  - `fixed_attributes` — `geometry.type`
  - `origin_attributes` — position at origin
- All IDs generated via ULID.
- Label defaults should be unique-by-name by accepting an optional `label` parameter
  (already implemented). Callers may pass a counter suffix to avoid duplicate display
  names (e.g., `"Sphere 2"`).

### R7 — ULID Dependency

- Add `ulid` npm package (MIT, ~1 kB, no transitive deps) to `dependencies`.
- Used only in `PrimitiveFactory` and `ElementStore`-adjacent code (attribute id
  generation on add operations).

### R8 — Selection Highlight (SelectionHighlight)

- Pure Three.js module in `src/elements/SelectionHighlight.ts`.
- `createSelectionHighlight()` returns `SelectionHighlightApi`:
  - `attach(mesh: THREE.Mesh): void` — clones the mesh geometry, creates a
    `MeshBasicMaterial({ side: BackSide, color: 0x00aaff })`, scales the clone by
    `1.015`, and adds it as a named child of `mesh`.
  - `detach(mesh: THREE.Mesh): void` — finds and removes the outline child from `mesh`.
  - `clear(sceneManager: SceneManager): void` — detaches from whatever mesh is currently
    highlighted (uses internal tracked id).
- `ElementRenderer` calls `highlight.attach/detach` when `setSelected(id)` is invoked.

### R9 — Transform Gizmo (TransformGizmo)

- Module at `src/scene/TransformGizmo.ts`.
- `createTransformGizmo(camera, domElement, orbitControls)` returns `TransformGizmoApi`:
  - `attach(object: THREE.Object3D): void` — binds TransformControls to the object.
  - `detach(): void` — hides the gizmo.
  - `setMode(mode: 'translate' | 'rotate' | 'scale'): void`.
  - `getHelper(): THREE.Object3D` — the gizmo scene helper to add to the Three.js scene.
  - `onObjectChange(cb: (obj: THREE.Object3D) => void): void` — fires during drag.
  - `dispose(): void`.
- Internally wires `dragging-changed` to toggle `orbitControls.enabled` on/off.
- `Viewport.ts` creates `TransformGizmo`, adds the helper to the scene, and exposes
  `getTransformGizmo(): TransformGizmoApi` on `ViewportApi`.
- `ElementPanel` calls `viewport.getTransformGizmo().attach/detach` on selection change.
- On `objectChange`: read `object.position`/`rotation`/`scale`, convert to
  `origin_attributes`, call `updateElement` + `save` (but **skip** `renderer.sync`
  during drag to avoid recreating the mesh while TransformControls is attached).
  Call `renderer.sync` only on `mouseUp`/drag-end.

### R10 — System Settings Panel (SystemSettings + SystemPanel)

- `src/system/SystemSettings.ts` — pure-data settings store:
  - localStorage key: `frameer3d.v1.settings`
  - Schema: `{ theme: 'dark' | 'light', followSystem: boolean }`
  - `loadSettings(): SystemSettingsData` (with fallback to `{ theme: 'dark', followSystem: false }`)
  - `saveSettings(data: SystemSettingsData): void`
  - `applyTheme(data: SystemSettingsData): void` — sets `document.documentElement.dataset['theme']`
    to `'dark'` or `'light'`; CSS variables react to this attribute.
  - `detectSystemTheme(): 'dark' | 'light'` — reads `window.matchMedia('(prefers-color-scheme: dark)')`
- `src/system/SystemPanel.ts` — Tweakpane panel:
  - Positioned as a `position: fixed` panel in the bottom-left corner.
  - Bindings: `Theme` (list: `dark` / `light`), `Follow system` (checkbox).
  - When `followSystem` is toggled on, immediately apply the OS theme and grey-out the
    manual `Theme` input.
  - Listens to `matchMedia.addEventListener('change', ...)` when `followSystem` is active.
  - On change: saves to `SystemSettings` and calls `applyTheme`.
- CSS:
  - CSS custom properties (`--bg`, `--fg`, `--panel-bg`, etc.) declared on `:root`.
  - `[data-theme="light"]` on `<html>` overrides them for light mode.
  - `main.ts` calls `applyTheme(loadSettings())` on startup (before first render) to
    prevent flash.

---

## Key Architectural Constraints

**Rendering is always driven from data.** The call chain is:

```
User action → ElementStore (write) → ElementRenderer (read + update scene)
                                   → ElementControls (read + bind pane)
                                   → ElementPanel (read + update list UI)
```

No component reads state from another component. All components read from the same
`ElementStoreData` snapshot.

**Transform gizmo exception**: During an active TransformControls drag, the mesh is moved
imperatively by Three.js. `renderer.sync()` is suppressed during drag to avoid
recreating the mesh while it is attached to the gizmo. Store `origin_attributes` are
updated from the mesh's final world position/rotation/scale after drag-end, then
`renderer.sync()` is called once to reconcile.

**System settings are orthogonal**: `SystemSettings` and `SystemPanel` have no imports
from `elements/` or `scene/`. They are wired in `main.ts` only.
