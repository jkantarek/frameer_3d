# Contract: Elements Domain API

**Feature**: `002-elements-floating-panel`
**Date**: 2026-04-29 (updated 2026-04-30)

This document defines the public API contracts for all modules in the `src/elements/`
domain. These interfaces are the stable boundaries between the elements domain and the
rest of the application (Three.js scene, Tweakpane control pane, and the HTML shell).

---

## 1. `ElementTypes` (exported from `src/elements/ElementTypes.ts`)

All types that cross module boundaries are declared here and re-exported from `index.ts`.

```ts
// Attribute type enum — drives Tweakpane binding widget
export type AttributeType = 'number' | 'string' | 'boolean' | 'color' | 'select';

export interface ParametricAttribute {
  readonly id: string;
  readonly attribute_uri_key: string;
  readonly attribute_value: string;
  readonly attribute_type: AttributeType;
}

export interface FixedAttribute {
  readonly id: string;
  readonly attribute_uri_key: string;
  readonly attribute_value: string;
}

export interface OriginAttribute {
  readonly id: string;
  readonly dimension_uri_key: string;
  readonly dimension_uri_value: number;
}

export interface SceneElement {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly parametric_attributes: readonly ParametricAttribute[];
  readonly fixed_attributes: readonly FixedAttribute[];
  readonly origin_attributes: readonly OriginAttribute[];
  readonly child_elements: readonly SceneElement[];
}

export interface ElementStoreData {
  readonly elements: readonly SceneElement[];
}
```

---

## 2. `ElementStore` (exported from `src/elements/ElementStore.ts`)

Pure-data store with no Three.js or DOM imports. All mutation functions are pure —
they return a new `ElementStoreData` without mutating the input.

```ts
// Load from localStorage; returns { elements: [] } on failure or absence
export function load(): ElementStoreData;

// Persist to localStorage; silently handles QuotaExceededError
export function save(data: ElementStoreData): void;

// Append a new element at the top level; returns updated store data
export function addElement(data: ElementStoreData, el: SceneElement): ElementStoreData;

// Remove an element by id (searches recursively through child_elements)
// Returns data unchanged if id not found
export function removeElement(data: ElementStoreData, id: string): ElementStoreData;

// Replace the first matching element (by id, recursive search) with the updated version
// Returns data unchanged if id not found
export function updateElement(
  data: ElementStoreData,
  updated: SceneElement,
): ElementStoreData;

// Find an element by id (recursive depth-first search)
// Returns undefined if not found
export function findElement(
  data: ElementStoreData,
  id: string,
): SceneElement | undefined;
```

---

## 3. `PrimitiveFactory` (exported from `src/elements/PrimitiveFactory.ts`)

Creates pre-populated `SceneElement` values for the four supported primitive types.
IDs are generated via `ulid()`. All primitives include a `material.color` attribute
(`type: 'color'`, default `"#888888"`). No external side effects.

```ts
// Create a SceneElement representing a box primitive (width=1, height=1, depth=1)
export function createBox(label?: string): SceneElement;

// Create a SceneElement representing a sphere primitive (radius=1)
export function createSphere(label?: string): SceneElement;

// Create a SceneElement representing a cylinder primitive (radius=0.5, height=2)
export function createCylinder(label?: string): SceneElement;

// Create a SceneElement representing a flat plane (width=2, height=2, DoubleSide)
export function createPlane(label?: string): SceneElement;
```

---

## 4. `ElementRenderer` (exported from `src/elements/ElementRenderer.ts`)

Bridges `ElementStoreData` to the Three.js `SceneManager`. Reads element data and
maintains the Three.js scene to mirror the store. No knowledge of UI or controls.

```ts
// Create a renderer bound to the given SceneManager.
export function createElementRenderer(sceneManager: SceneManager): ElementRendererApi;

export interface ElementRendererApi {
  // Synchronise the Three.js scene to match the provided element store data.
  // Removes meshes for elements no longer in data; adds/updates meshes for new/changed ones.
  // Also reads material.color from parametric_attributes and applies it to the mesh material.
  sync(data: ElementStoreData): void;

  // Set the currently selected element id.
  // Attaches a BackSide outline child to the selected mesh; removes it from the previously
  // selected mesh. Pass undefined to clear the selection outline.
  setSelected(id: string | undefined): void;
}
```

**Geometry resolution from attributes**:

| `fixed_attributes["geometry.type"]` | Three.js Geometry | Parametric keys used |
|--------------------------------------|-------------------|----------------------|
| `"box"`      | `BoxGeometry(w, h, d)`       | `geometry.width`, `geometry.height`, `geometry.depth` |
| `"sphere"`   | `SphereGeometry(r, 32, 16)`  | `geometry.radius` |
| `"cylinder"` | `CylinderGeometry(r, r, h)`  | `geometry.radius`, `geometry.height` |
| `"plane"`    | `PlaneGeometry(w, h)`        | `geometry.width`, `geometry.height` |

`origin_attributes` map to `Object3D.position` via `position.x / position.y / position.z`.
`material.color` parametric attribute is read as a CSS hex string and applied to
`MeshStandardMaterial.color`.

---

## 5. `ElementControls` (exported from `src/elements/ElementControls.ts`)

Bridges a selected `SceneElement` to a Tweakpane `FolderApi`, creating dynamic bindings
per `attribute_type`. No knowledge of the panel UI or scene.

```ts
export function createElementControls(folder: FolderApi): ElementControlsApi;

export interface ElementControlsApi {
  // Bind the given element's attributes into the folder.
  // Clears all existing folder children first.
  // Adds a 'Name' text binding at the top for element.label.
  // onChange is called with the updated SceneElement whenever any binding changes.
  bind(element: SceneElement, onChange: (updated: SceneElement) => void): void;

  // Remove all bindings from the folder
  clear(): void;
}
```

**Binding order**:
1. `Name` — text input bound to `element.label` (calls onChange with updated label)
2. Parametric attributes — in declaration order
3. Fixed attributes — read-only monitors

**Binding type map**:

| `attribute_type` | Tweakpane options |
|------------------|-------------------|
| `'number'`       | `{ step: 0.01 }` |
| `'string'`       | `{}` (default text input) |
| `'boolean'`      | `{}` (checkbox) |
| `'color'`        | auto-detected from CSS hex string |
| `'select'`       | `{ options: parsed from attribute_value as JSON array }` |

---

## 6. `ElementPanel` (exported from `src/elements/ElementPanel.ts`)

Manages the floating panel DOM overlay. Coordinates reads/writes between
`ElementStore`, `ElementRenderer`, `ElementControls`, `PrimitiveFactory`, and the
`TransformGizmoApi` from the Viewport.

```ts
export interface ElementPanelApi {
  // Return the root panel element (for testing visibility / DOM queries)
  getElement(): HTMLElement;

  // Dispose all DOM listeners and clean up Tweakpane bindings
  dispose(): void;
}

// Mount the elements panel inside the given container element.
// sceneManager: used to create the ElementRenderer
// controlFolder: Tweakpane FolderApi for element attribute bindings
// transformGizmo: optional; if provided, gizmo is attached/detached on selection change
export function createElementPanel(
  container: HTMLElement,
  sceneManager: SceneManager,
  controlFolder: FolderApi,
  transformGizmo?: TransformGizmoApi,
): ElementPanelApi;
```

**UI behaviour**:
- The "+" button is positioned **below** all element rows in the scene list.
- Each element row contains an inline "×" button that is only shown when
  `aria-selected="true"` for that row. Clicking "×" removes the element, clears
  the control pane, and calls `transformGizmo?.detach()`.
- On element selection, calls `renderer.setSelected(id)` and `transformGizmo?.attach(mesh)`.
- On `transformGizmo?.onObjectChange`: updates `origin_attributes` in store and saves;
  does **not** call `renderer.sync()` during active drag.
- On drag-end (`mouseUp`): calls `renderer.sync(state)` to reconcile the scene.

---

## 7. `SelectionHighlight` (exported from `src/elements/SelectionHighlight.ts`)

Manages the double-mesh BackSide outline for the selected 3D object.

```ts
export function createSelectionHighlight(): SelectionHighlightApi;

export interface SelectionHighlightApi {
  // Add a BackSide outline clone as a named child of mesh.
  // Safe to call multiple times on the same mesh (idempotent).
  attach(mesh: THREE.Mesh): void;

  // Remove the outline child from mesh.
  // No-op if the mesh has no outline child.
  detach(mesh: THREE.Mesh): void;

  // Remove the outline from the mesh identified by id via SceneManager.
  // No-op if no mesh found or mesh has no outline.
  clear(sceneManager: SceneManager, id: string): void;
}
```

---

## 8. Public Re-exports (`src/elements/index.ts`)

```ts
export type {
  AttributeType,
  ParametricAttribute,
  FixedAttribute,
  OriginAttribute,
  SceneElement,
  ElementStoreData,
  ElementRendererApi,
  ElementControlsApi,
  SelectionHighlightApi,
  ElementPanelApi,
} from './ElementTypes.js';

export { load, save, addElement, removeElement, updateElement, findElement } from './ElementStore.js';
export { createBox, createSphere, createCylinder, createPlane } from './PrimitiveFactory.js';
export { createElementRenderer } from './ElementRenderer.js';
export { createSelectionHighlight } from './SelectionHighlight.js';
export { createElementControls } from './ElementControls.js';
export { createElementPanel } from './ElementPanel.js';
```

---

## Integration with `main.ts`

The coordinator wires everything together:

```ts
// After existing viewport + controlPane setup:
const elementFolder = controlPane.addFolder('Element');
const transformGizmo = viewport.getTransformGizmo();
createElementPanel(viewportContainer, sceneManager, elementFolder, transformGizmo);

// System settings (early, before first render, to avoid theme flash):
const settings = loadSettings();
applyTheme(settings);
createSystemPanel(settings);
```

The panel self-manages its lifecycle: it loads from localStorage on mount, syncs the
renderer, and hooks the "+" button (at the bottom) to the primitive picker.
