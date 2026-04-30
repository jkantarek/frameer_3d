# Data Model: Elements Floating Panel

**Feature**: `002-elements-floating-panel`
**Date**: 2026-04-29 (updated 2026-04-30)

---

## Overview

The element data model is a recursive tree structure persisted to `localStorage`. It is the
single source of truth for the entire application — the 3D scene and the UI are derived
views, always rendered from the stored data.

---

## Core Types

### `AttributeType` (Enum)

Drives the Tweakpane binding type when an element is selected in the panel.

```ts
type AttributeType = 'number' | 'string' | 'boolean' | 'color' | 'select';
```

### `ParametricAttribute`

A user-editable attribute exposed in the control pane. Value is always stored as a string
and coerced by `attribute_type` for display and binding.

```ts
interface ParametricAttribute {
  id: string;                // ULID — creation-ordered, unique within the attribute list
  attribute_uri_key: string; // dot-path key, e.g. "geometry.width", "material.roughness"
  attribute_value: string;   // stored as string; coerced to number / boolean / color on bind
  attribute_type: AttributeType;
}
```

**Validation rules**:
- `id` must be a 26-char Crockford Base32 string (ULID format).
- `attribute_uri_key` must be non-empty; convention is dot-separated namespace + key.
- `attribute_value` must be a valid string representation of `attribute_type`.
- `attribute_type` must be one of the five enum values.

### `FixedAttribute`

A non-editable metadata attribute (read-only monitor in the control pane).

```ts
interface FixedAttribute {
  id: string;                // ULID
  attribute_uri_key: string; // e.g. "geometry.type", "material.preset"
  attribute_value: string;   // always string; never bound as an input widget
}
```

### `OriginAttribute`

A floating-point spatial dimension (position, rotation, scale components).

```ts
interface OriginAttribute {
  id: string;                   // ULID
  dimension_uri_key: string;    // e.g. "position.x", "rotation.y", "scale.z"
  dimension_uri_value: number;  // IEEE 754 double; stored as JSON number (no precision loss)
}
```

### `SceneElement`

The recursive core entity. A `SceneElement` may contain `child_elements` of the same type,
forming a tree of arbitrary depth.

```ts
interface SceneElement {
  id: string;                                // ULID — globally unique; sort by id for chronology
  label: string;                             // display name in the Elements panel
  description: string;                       // optional human note (may be empty string)
  parametric_attributes: ParametricAttribute[];  // user-editable via control pane
  fixed_attributes: FixedAttribute[];            // read-only metadata
  origin_attributes: OriginAttribute[];          // spatial dimensions
  child_elements: SceneElement[];                // recursive children (may be empty)
}
```

### `ElementStoreData`

Root envelope stored in `localStorage` under key `frameer3d.v1.elements`.

```ts
interface ElementStoreData {
  elements: SceneElement[];   // top-level elements; children are nested inside each element
}
```

---

## Primitive Defaults

Primitives created by `PrimitiveFactory` pre-populate attributes as follows:

### Box

| Attribute Array       | Key                 | Value  | Type   |
|-----------------------|---------------------|--------|--------|
| `parametric_attributes` | `geometry.width`   | `"1"`  | number |
| `parametric_attributes` | `geometry.height`  | `"1"`  | number |
| `parametric_attributes` | `geometry.depth`   | `"1"`  | number |
| `parametric_attributes` | `material.color`   | `"#888888"` | color |
| `fixed_attributes`    | `geometry.type`     | `"box"` | —     |
| `origin_attributes`   | `position.x`        | `0`    | —      |
| `origin_attributes`   | `position.y`        | `0`    | —      |
| `origin_attributes`   | `position.z`        | `0`    | —      |

### Sphere

| Attribute Array       | Key                 | Value  | Type   |
|-----------------------|---------------------|--------|--------|
| `parametric_attributes` | `geometry.radius`  | `"1"`  | number |
| `parametric_attributes` | `material.color`   | `"#888888"` | color |
| `fixed_attributes`    | `geometry.type`     | `"sphere"` | — |
| `origin_attributes`   | `position.x`        | `0`    | —      |
| `origin_attributes`   | `position.y`        | `0`    | —      |
| `origin_attributes`   | `position.z`        | `0`    | —      |

### Cylinder

| Attribute Array       | Key                 | Value   | Type   |
|-----------------------|---------------------|---------|--------|
| `parametric_attributes` | `geometry.radius`  | `"0.5"` | number |
| `parametric_attributes` | `geometry.height`  | `"2"`   | number |
| `parametric_attributes` | `material.color`   | `"#888888"` | color |
| `fixed_attributes`    | `geometry.type`     | `"cylinder"` | — |
| `origin_attributes`   | `position.x`        | `0`     | —      |
| `origin_attributes`   | `position.y`        | `0`     | —      |
| `origin_attributes`   | `position.z`        | `0`     | —      |

### Plane

| Attribute Array       | Key                 | Value  | Type   |
|-----------------------|---------------------|--------|--------|
| `parametric_attributes` | `geometry.width`   | `"2"`  | number |
| `parametric_attributes` | `geometry.height`  | `"2"`  | number |
| `parametric_attributes` | `material.color`   | `"#888888"` | color |
| `fixed_attributes`    | `geometry.type`     | `"plane"` | — |
| `origin_attributes`   | `position.x`        | `0`    | —      |
| `origin_attributes`   | `position.y`        | `0`    | —      |
| `origin_attributes`   | `position.z`        | `0`    | —      |

---

## State Transitions

```
ElementStoreData (empty)
    │
    ▼ addElement(box)
ElementStoreData { elements: [Box] }
    │
    ▼ addElement(sphere)
ElementStoreData { elements: [Box, Sphere] }
    │
    ▼ updateElement(Box with new parametric_attribute value)
ElementStoreData { elements: [Box', Sphere] }  ← immutable update
    │
    ▼ removeElement(Box'.id)
ElementStoreData { elements: [Sphere] }
```

All mutations return a **new** `ElementStoreData` object (immutable-update pattern).
Callers call `save(newData)` explicitly to persist.

---

## Module Layout

```
src/elements/
├── ElementTypes.ts        — AttributeType, ParametricAttribute, FixedAttribute,
│                            OriginAttribute, SceneElement, ElementStoreData
├── ElementStore.ts        — load, save, addElement, removeElement, updateElement, findElement
├── ElementPanel.ts        — floating panel DOM + element list + "+" button
├── PrimitiveFactory.ts    — createBox, createSphere, createCylinder
├── ElementRenderer.ts     — SceneManager integration; renders from ElementStoreData
├── ElementControls.ts     — Tweakpane bindings for selected SceneElement
└── index.ts               — public API re-exports
```

### Dependency Graph

```
ElementTypes.ts         ← no deps (pure types)
ElementStore.ts         ← ElementTypes
PrimitiveFactory.ts     ← ElementTypes, ulid
ElementRenderer.ts      ← ElementTypes, SceneManager (three.js boundary)
ElementControls.ts      ← ElementTypes, ControlPane (tweakpane boundary)
ElementPanel.ts         ← ElementTypes, ElementStore, PrimitiveFactory (DOM boundary)
index.ts                ← re-exports from all above
```

No circular dependencies. Three.js and Tweakpane are only imported by their dedicated
boundary modules (`ElementRenderer`, `ElementControls`).

---

## localStorage Persistence

| Key | Type | Notes |
|-----|------|-------|
| `frameer3d.v1.elements` | JSON `ElementStoreData` | Top-level key; falls back to `{ elements: [] }` if absent or corrupt |

**Error handling**:
- Parse failure → `console.warn` + return empty store.
- `setItem` quota exceeded → `console.warn` + silently skip save.
- Future migration: bump to `frameer3d.v2.elements` if schema changes.

---

## System Settings Entity

### `ThemeValue`

```ts
type ThemeValue = 'dark' | 'light';
```

### `SystemSettingsData`

Persisted to `localStorage` under key `frameer3d.v1.settings`.

```ts
interface SystemSettingsData {
  theme: ThemeValue;         // active theme; default 'dark'
  followSystem: boolean;     // if true, always match OS prefers-color-scheme
}
```

**Validation rules**:
- `theme` must be `'dark'` or `'light'`.
- `followSystem` is boolean; defaults to `false`.
- Fallback on parse failure: `{ theme: 'dark', followSystem: false }`.

**State Transitions**:

```
SystemSettingsData { theme: 'dark', followSystem: false }
    │
    ▼ user clicks "Light"
SystemSettingsData { theme: 'light', followSystem: false }
    │
    ▼ user enables "Follow system" (OS is dark)
SystemSettingsData { theme: 'dark', followSystem: true }
    │
    ▼ OS switches to light
SystemSettingsData { theme: 'light', followSystem: true }   ← updated automatically
```

---

## Updated Module Layout

```
src/elements/
├── ElementTypes.ts        — AttributeType, ParametricAttribute, FixedAttribute,
│                            OriginAttribute, SceneElement, ElementStoreData
│                            (no changes — color type already present in AttributeType)
├── ElementStore.ts        — load, save, addElement, removeElement, updateElement, findElement
├── ElementPanel.ts        — floating panel DOM + element list + "+" (bottom) + per-row "×"
├── PrimitiveFactory.ts    — createBox, createSphere, createCylinder, createPlane
│                            (all include material.color attribute)
├── ElementRenderer.ts     — SceneManager integration + material.color + selection highlight
├── SelectionHighlight.ts  — (new) double-mesh BackSide outline; attach/detach API
├── ElementControls.ts     — Tweakpane bindings + label binding at top
└── index.ts               — public API re-exports

src/scene/
├── SceneManager.ts        — (unchanged)
├── SceneRenderer.ts       — (unchanged)
└── TransformGizmo.ts      — (new) TransformControls wrapper; attach/detach/setMode

src/system/
├── SystemSettings.ts      — (new) loadSettings, saveSettings, applyTheme, detectSystemTheme
└── SystemPanel.ts         — (new) bottom-left Tweakpane panel; theme + followSystem bindings

src/viewport/
├── Viewport.ts            — (updated) creates TransformGizmo; exposes getTransformGizmo()
└── ViewportResize.ts      — (unchanged)
```

### Updated Dependency Graph

```
ElementTypes.ts            ← no deps (pure types)
ElementStore.ts            ← ElementTypes
PrimitiveFactory.ts        ← ElementTypes, ulid
SelectionHighlight.ts      ← ElementTypes, three (boundary)
ElementRenderer.ts         ← ElementTypes, SceneManager, SelectionHighlight (three boundary)
ElementControls.ts         ← ElementTypes, ControlPane (tweakpane boundary)
ElementPanel.ts            ← ElementTypes, ElementStore, PrimitiveFactory,
                             ElementRenderer, ElementControls, ViewportApi
TransformGizmo.ts          ← three/addons/controls/TransformControls
Viewport.ts                ← TransformGizmo, SceneManager, SceneRenderer (three boundary)
SystemSettings.ts          ← no deps (pure + DOM boundary for matchMedia)
SystemPanel.ts             ← SystemSettings, tweakpane
```

No circular dependencies. `system/` has no imports from `elements/` or `scene/`.
