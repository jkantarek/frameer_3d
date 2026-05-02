# Data Model: Rotation & Project Management

**Branch**: `003-rotation-and-project-management` | **Date**: 2026-05-01

---

## 1. Extended SceneElement

```ts
// src/elements/ElementTypes.ts  (additions marked NEW)

export interface SceneElement {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly parametric_attributes: readonly ParametricAttribute[];
  readonly fixed_attributes: readonly FixedAttribute[];
  readonly origin_attributes: readonly OriginAttribute[];   // position.x/y/z
  readonly rotation_attributes: readonly OriginAttribute[]; // NEW: rotation.x/y/z (radians)
  readonly child_elements: readonly SceneElement[];
}
```

**New rotation_attributes keys** (Euler, radians, Three.js XYZ order):

| Key | Type | Default |
|-----|------|---------|
| `rotation.x` | `number` (rad) | `0` |
| `rotation.y` | `number` (rad) | `0` |
| `rotation.z` | `number` (rad) | `0` |

**Migration note**: Existing persisted `SceneElement` records from earlier development builds may not have `rotation_attributes`. All read paths MUST treat a missing or empty array as `[{rotation.x: 0}, {rotation.y: 0}, {rotation.z: 0}]` using the same defensive-guard pattern used elsewhere in the codebase. `localStorage` contents are always considered potentially corrupt.

---

## 2. Project Domain Types

```ts
// src/project/ProjectTypes.ts

export interface ProjectSummary {
  readonly id: string;            // ULID
  readonly name: string;          // display name
  readonly created_at: string;    // ISO-8601
  readonly updated_at: string;    // ISO-8601
}

export interface Project extends ProjectSummary {
  readonly elements: readonly SceneElement[];
}

export interface ProjectRegistry {
  readonly projects: readonly ProjectSummary[];
}
```

**Storage keys**:

| Key | Contents |
|-----|---------|
| `frameer3d.v1.projects` | `ProjectRegistry` JSON |
| `frameer3d.v1.project.<id>` | `Project` JSON |

All reads guard against missing keys, invalid JSON, and wrong types. Corrupt data → sane default + `console.warn`.

---

## 3. ProjectStore API

```ts
// src/project/ProjectStore.ts

// Load the project registry (all summaries). Returns { projects: [] } if not found.
export function loadRegistry(storage?: Storage): ProjectRegistry;

// Persist the project registry.
export function saveRegistry(registry: ProjectRegistry, storage?: Storage): void;

// Load a single project by ID. Returns undefined if not found.
export function loadProject(id: string, storage?: Storage): Project | undefined;

// Persist a single project (upserts the summary in the registry automatically).
export function saveProject(project: Project, storage?: Storage): void;

// Create a new project with a fresh ULID, default name, empty elements.
export function createProject(name?: string, storage?: Storage): Project;

// Remove a project by ID (removes from registry and deletes its storage key).
export function deleteProject(id: string, storage?: Storage): void;
```

---

## 4. ProjectRouter API

```ts
// src/project/ProjectRouter.ts

// Read ?project=<id> from the current URL. Returns undefined if not present.
export function getActiveProjectId(): string | undefined;

// Push a new project ID into the URL via history.replaceState, no page reload.
export function setActiveProjectId(id: string): void;

// Clear the project query param (falls back to default project).
export function clearActiveProjectId(): void;
```

---

## 5. ProjectBootstrap Helper

```ts
// src/project/ProjectBootstrap.ts

// Reads ?project=<id> from the URL.
// - If present and valid: load project (or create fresh if not in storage).
// - If absent or blank: create a new project, call setActiveProjectId().
// Returns the resolved project (always non-null; sane empty default on any corrupt data).
export function resolveOrCreateProject(storage?: Storage): Project;
```

This replaces the former `ProjectMigration.ts`. There is no legacy data path because the app is not deployed. The helper is the single entry point in `main.ts` for determining the active project on startup.

---

## 6. GizmoToolbar

```ts
// src/scene/GizmoToolbar.ts

export interface GizmoToolbarApi {
  setActiveMode(mode: TransformMode): void;
  dispose(): void;
}

// Creates 3 <button> elements inside `container`.
// Calls gizmo.setMode(mode) on click.
// Returns API to sync active button and remove DOM on dispose.
export function createGizmoToolbar(
  container: HTMLElement,
  gizmo: TransformGizmoApi,
): GizmoToolbarApi;
```

**DOM structure** (added inside `#viewport-container` or equivalent):

```html
<div id="gizmo-toolbar" role="toolbar" aria-label="Transform mode">
  <button data-mode="translate" aria-pressed="true">Move</button>
  <button data-mode="rotate"    aria-pressed="false">Rotate</button>
  <button data-mode="scale"     aria-pressed="false">Scale</button>
</div>
```

Positioned via inline CSS: `position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); z-index: 10`.

---

## 7. ElementPanel modifications

The `createElementPanel` function in `src/elements/ElementPanel.ts` currently calls `load()` / `save()` from `ElementStore`. After this feature:

- Receives a `projectId: string` as a new parameter.
- Calls `loadProject(projectId)` on mount and `saveProject(...)` on every commit, replacing `load()` / `save()`.
- The `onObjectChange` callback is extended to also capture `rotation_attributes`:

```ts
rotation_attributes: el.rotation_attributes.map((a) => {
  if (a.dimension_uri_key === 'rotation.x') return { ...a, dimension_uri_value: obj.rotation.x };
  if (a.dimension_uri_key === 'rotation.y') return { ...a, dimension_uri_value: obj.rotation.y };
  if (a.dimension_uri_key === 'rotation.z') return { ...a, dimension_uri_value: obj.rotation.z };
  return a;
}),
```

---

## 8. SystemPanel modifications

The `createSystemPanel` function receives two new callbacks:

```ts
export function createSystemPanel(
  initialSettings: SystemSettingsData,
  projectRegistry: ProjectRegistry,
  activeProjectId: string,
  onThemeChange?: (theme: ThemeValue) => void,
  onNewProject?: () => void,
  onSelectProject?: (id: string) => void,
  onRenameProject?: (id: string, name: string) => void,
  _container?: HTMLElement,
): SystemPanelApi;
```

**UI additions** (new "Projects" Tweakpane folder inside the System pane):
- Text binding for current project name (calls `onRenameProject`)
- Button "New Project" (calls `onNewProject`)
- Per-project buttons from registry (calls `onSelectProject(id)`)

---

## 9. ElementRenderer modifications

`syncElement` is extended to apply rotation:

```ts
mesh.rotation.set(
  getRotation(element, 'rotation.x'),
  getRotation(element, 'rotation.y'),
  getRotation(element, 'rotation.z'),
);
```

Where `getRotation` follows the same pattern as `getOrigin`:

```ts
function getRotation(element: SceneElement, key: string): number {
  const attr = element.rotation_attributes?.find((a) => a.dimension_uri_key === key);
  return attr?.dimension_uri_value ?? 0;
}
```

---

## 10. State Transition Diagram

```
App boots
  │
  ├─ URL has ?project=<id> (non-empty)
  │     ├─ Project exists in storage → load Project → render elements
  │     └─ Project NOT in storage (or corrupt) → create fresh Project with that id → render empty
  │
  └─ URL has no ?project= (or blank)
        └─ Create new Project (fresh ULID) → saveProject() → replaceState(?project=<id>) → render empty
```

---

## 11. File Size Risk Assessment

| File | Current LOC (non-comment) | Projected LOC after changes | Action |
|------|--------------------------|----------------------------|--------|
| `src/elements/ElementTypes.ts` | ~35 | ~42 | Safe |
| `src/elements/ElementPanel.ts` | ~115 | ~140 | Monitor; split if needed |
| `src/elements/ElementRenderer.ts` | ~95 | ~105 | Safe |
| `src/elements/PrimitiveFactory.ts` | ~75 | ~85 | Safe |
| `src/system/SystemPanel.ts` | ~70 | ~110 | Monitor; may need `ProjectsFolder.ts` extract |
| `src/project/ProjectStore.ts` | new | ~90 | Safe |
| `src/project/ProjectTypes.ts` | new | ~30 | Safe |
| `src/project/ProjectRouter.ts` | new | ~25 | Safe |
| `src/project/ProjectBootstrap.ts` | new | ~30 | Safe |
| `src/scene/GizmoToolbar.ts` | new | ~55 | Safe |
