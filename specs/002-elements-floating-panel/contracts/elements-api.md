# Contract: Elements Domain API

**Feature**: `002-elements-floating-panel`
**Date**: 2026-04-29

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

Creates pre-populated `SceneElement` values for the three supported primitive types.
IDs are generated via `ulid()`. No external side effects.

```ts
// Create a SceneElement representing a box primitive (width=1, height=1, depth=1)
export function createBox(label?: string): SceneElement;

// Create a SceneElement representing a sphere primitive (radius=1)
export function createSphere(label?: string): SceneElement;

// Create a SceneElement representing a cylinder primitive (radius=0.5, height=2)
export function createCylinder(label?: string): SceneElement;
```

---

## 4. `ElementRenderer` (exported from `src/elements/ElementRenderer.ts`)

Bridges `ElementStoreData` to the Three.js `SceneManager`. Reads element data and
maintains the Three.js scene to mirror the store. No knowledge of UI or controls.

```ts
// Create a renderer bound to the given SceneManager.
// Returns an object with a single `sync` method.
export function createElementRenderer(sceneManager: SceneManager): ElementRendererApi;

export interface ElementRendererApi {
  // Synchronise the Three.js scene to match the provided element store data.
  // Removes meshes for elements no longer in data; adds/updates meshes for new/changed ones.
  sync(data: ElementStoreData): void;
}
```

**Geometry resolution from attributes**:

| `fixed_attributes["geometry.type"]` | Three.js Geometry | Parametric keys used |
|--------------------------------------|-------------------|----------------------|
| `"box"`      | `BoxGeometry(w, h, d)`       | `geometry.width`, `geometry.height`, `geometry.depth` |
| `"sphere"`   | `SphereGeometry(r, 32, 16)`  | `geometry.radius` |
| `"cylinder"` | `CylinderGeometry(r, r, h)`  | `geometry.radius`, `geometry.height` |

`origin_attributes` map to `Object3D.position` via `position.x / position.y / position.z`.

---

## 5. `ElementControls` (exported from `src/elements/ElementControls.ts`)

Bridges a selected `SceneElement` to a Tweakpane `FolderApi`, creating dynamic bindings
per `attribute_type`. No knowledge of the panel UI or scene.

```ts
export function createElementControls(folder: FolderApi): ElementControlsApi;

export interface ElementControlsApi {
  // Bind the given element's attributes into the folder.
  // Clears all existing folder children first.
  // onChange is called with the updated SceneElement whenever any binding changes.
  bind(element: SceneElement, onChange: (updated: SceneElement) => void): void;

  // Remove all bindings from the folder
  clear(): void;
}
```

**Binding type map**:

| `attribute_type` | Tweakpane options |
|------------------|-------------------|
| `'number'`       | `{ min: -Infinity, max: Infinity, step: 0.01 }` |
| `'string'`       | `{}` (default text input) |
| `'boolean'`      | `{}` (checkbox) |
| `'color'`        | `{ view: 'color' }` |
| `'select'`       | `{ options: parsed from attribute_value as JSON array }` |

---

## 6. `ElementPanel` (exported from `src/elements/ElementPanel.ts`)

Manages the floating panel DOM overlay. Coordinates reads/writes between
`ElementStore`, `ElementRenderer`, `ElementControls`, and `PrimitiveFactory`.

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
export function createElementPanel(
  container: HTMLElement,
  sceneManager: SceneManager,
  controlFolder: FolderApi,
): ElementPanelApi;
```

---

## 7. Public Re-exports (`src/elements/index.ts`)

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
  ElementPanelApi,
} from './ElementTypes.js';

export { load, save, addElement, removeElement, updateElement, findElement } from './ElementStore.js';
export { createBox, createSphere, createCylinder } from './PrimitiveFactory.js';
export { createElementRenderer } from './ElementRenderer.js';
export { createElementControls } from './ElementControls.js';
export { createElementPanel } from './ElementPanel.js';
```

---

## Integration with `main.ts`

The coordinator wires everything together. The key change to `main.ts`:

```ts
// After existing viewport + controlPane setup:
const elementFolder = controlPane.addFolder('Element');
createElementPanel(viewportContainer, sceneManager, elementFolder);
```

The panel self-manages its lifecycle: it loads from localStorage on mount, syncs the
renderer, and hooks the "+" button to the primitive picker.
