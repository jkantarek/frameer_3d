# Public Contracts: Rotation & Project Management

**Branch**: `003-rotation-and-project-management` | **Date**: 2026-05-01

These contracts define the stable public API boundaries for this feature. Any change that breaks a contract requires a deliberate decision.

---

## Contract 1: SceneElement (Extended)

**Module**: `src/elements/ElementTypes.ts`  
**Export**: `SceneElement` interface

```ts
interface SceneElement {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly parametric_attributes: readonly ParametricAttribute[];
  readonly fixed_attributes: readonly FixedAttribute[];
  readonly origin_attributes: readonly OriginAttribute[];
  readonly rotation_attributes: readonly OriginAttribute[];  // ADDED
  readonly child_elements: readonly SceneElement[];
}
```

**Breaking changes**: Adding `rotation_attributes` is additive. Existing code that spreads `SceneElement` (e.g. `{ ...el, label: ... }`) must include `rotation_attributes` in the spread. All factory functions (`createBox`, etc.) must initialize it.

---

## Contract 2: ProjectStore public functions

**Module**: `src/project/ProjectStore.ts`  
**Exports**: `loadRegistry`, `saveRegistry`, `loadProject`, `saveProject`, `createProject`, `deleteProject`

```ts
function loadRegistry(storage?: Storage): ProjectRegistry
function saveRegistry(registry: ProjectRegistry, storage?: Storage): void
function loadProject(id: string, storage?: Storage): Project | undefined
function saveProject(project: Project, storage?: Storage): void
function createProject(name?: string, storage?: Storage): Project
function deleteProject(id: string, storage?: Storage): void
```

All functions accept an optional `storage` parameter (default: `localStorage`) to support dependency injection in tests.

---

## Contract 3: ProjectRouter public functions

**Module**: `src/project/ProjectRouter.ts`  
**Exports**: `getActiveProjectId`, `setActiveProjectId`, `clearActiveProjectId`

```ts
function getActiveProjectId(): string | undefined
function setActiveProjectId(id: string): void
function clearActiveProjectId(): void
```

`setActiveProjectId` uses `history.replaceState` (not `location.assign`) so the browser history stack does not grow.

---

## Contract 4: GizmoToolbar API

**Module**: `src/scene/GizmoToolbar.ts`  
**Export**: `createGizmoToolbar`, `GizmoToolbarApi`

```ts
interface GizmoToolbarApi {
  setActiveMode(mode: TransformMode): void;
  dispose(): void;
}

function createGizmoToolbar(
  container: HTMLElement,
  gizmo: TransformGizmoApi,
): GizmoToolbarApi
```

---

## Contract 5: ProjectBootstrap

**Module**: `src/project/ProjectBootstrap.ts`  
**Export**: `resolveOrCreateProject`

```ts
function resolveOrCreateProject(storage?: Storage): Project
```

Always returns a valid `Project`. Never throws. If the URL has no `?project=` param, a new project is created and `setActiveProjectId` is called via `replaceState`. If the URL has an ID but storage is missing or corrupt, a fresh empty project with that ID is returned.

**Module**: `src/elements/ElementPanel.ts`  
**Export**: `createElementPanel`

```ts
function createElementPanel(
  container: HTMLElement,
  sceneManager: SceneManager,
  controlFolder: FolderApi,
  projectId: string,              // NEW
  transformGizmo?: TransformGizmoApi,
): ElementPanelApi
```

The `projectId` parameter routes all `load`/`save` calls through `ProjectStore`.

---

## Contract 6: SystemPanel API (updated signature)

**Module**: `src/system/SystemPanel.ts`  
**Export**: `createSystemPanel`

```ts
interface SystemPanelCallbacks {
  onThemeChange?: (theme: ThemeValue) => void;
  onNewProject?: () => void;
  onSelectProject?: (id: string) => void;
  onRenameProject?: (id: string, name: string) => void;
}

function createSystemPanel(
  initialSettings: SystemSettingsData,
  projectRegistry: ProjectRegistry,
  activeProjectId: string,
  callbacks?: SystemPanelCallbacks,
  _container?: HTMLElement,
): SystemPanelApi
```

Grouping callbacks into an options object prevents positional parameter fragility.

---

## Contract 7: localStorage schema version

Keys written by this feature:

| Key | Value type | Version |
|-----|-----------|----------|
| `frameer3d.v1.projects` | `ProjectRegistry` | v1 |
| `frameer3d.v1.project.<id>` | `Project` | v1 |
| `frameer3d.v1.settings` | `SystemSettingsData` *(unchanged)* | v1 |
| `frameer3d.v1.layout` | `LayoutState` *(unchanged)* | v1 |

All reads from these keys use type guards that return sane defaults on any corrupt or malformed data. No version bumps in this feature.
