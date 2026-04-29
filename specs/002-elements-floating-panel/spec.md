# Feature Spec: Elements Floating Panel

**Branch**: `002-elements-floating-panel`
**Date**: 2026-04-29
**Status**: Draft

---

## Overview

Add a left-side floating **Elements** panel to the Frameer 3D shell. The panel shows a
hierarchical list of scene elements and provides a **+** button to add primitive shapes
(box, sphere, cylinder). All element data is persisted in `localStorage` via a
centralized `ElementStore`. Rendering is always driven from the store — the UI and the
Three.js scene are both consumers of the same data object, never the source of truth.

Elements are identified by **ULIDs** (Universally Unique Lexicographically Sortable
Identifiers), which encode creation time so that chronological display order is natural
from a lexicographic sort without a separate timestamp field.

---

## Goals

1. Present a floating panel anchored to the left edge of the 3D viewport.
2. Panel shows a flat (initially) element list with recursive nesting support.
3. "**+**" button opens a primitive picker (box / sphere / cylinder) and appends the new
   element to the store.
4. Selecting an element binds its **parametric** and **fixed** attributes directly into
   the Tweakpane control pane.
5. The `ElementStore` is the **single source of truth** — renderer, panel, and controls
   are all read-only consumers that react to store changes.
6. All element data is persisted in `localStorage` (key `frameer3d.v1.elements`).
7. Supports recursive nesting: any element can have `child_elements`, each following the
   same schema.

---

## Non-Goals

- No drag-and-drop reordering.
- No undo/redo system.
- No import/export of element trees to JSON file.
- No real OpenCASCADE geometry generation in this feature — primitives rendered with
  Three.js `BoxGeometry`, `SphereGeometry`, `CylinderGeometry` as stand-ins.
- No multi-selection.
- No element deletion UI (store API will support it for future use).

---

## Requirements

### R1 — Elements Floating Panel

- Positioned as a CSS overlay anchored to the left edge of `#viewport-container`.
- Always visible (no collapse in v1); does not occlude the Tweakpane control pane.
- Shows a scrollable list of top-level elements; child elements indented under parents.
- Each row displays `label` and a selection indicator.
- Clicking a row selects that element and triggers control pane bindings (R5).
- "**+**" button at the bottom of the panel opens an inline primitive-type picker:
  `Box`, `Sphere`, `Cylinder`.
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
- Calls `SceneManager.addObject(el.id, mesh)` when an element is added.
- Calls `SceneManager.removeObject(el.id)` when an element is removed.
- On update: removes old mesh, adds rebuilt mesh.
- No awareness of panel UI or controls.

### R5 — ElementControls

- Activated when an element is selected in the panel.
- Clears all existing Tweakpane bindings in the "Element" folder.
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
- Each primitive pre-populates `parametric_attributes` (dimensions), `fixed_attributes`
  (`geometry.type`), and `origin_attributes` (position at origin).
- All IDs generated via ULID.

### R7 — ULID Dependency

- Add `ulid` npm package (MIT, ~1 kB, no transitive deps) to `dependencies`.
- Used only in `PrimitiveFactory` and `ElementStore`-adjacent code (attribute id
  generation on add operations).

---

## Key Architectural Constraint

**Rendering is always driven from data.** The call chain is:

```
User action → ElementStore (write) → ElementRenderer (read + update scene)
                                   → ElementControls (read + bind pane)
                                   → ElementPanel (read + update list UI)
```

No component reads state from another component. All components read from the same
`ElementStoreData` snapshot.
