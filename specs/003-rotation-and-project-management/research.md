# Research: Rotation & Project Management

**Branch**: `003-rotation-and-project-management` | **Date**: 2026-05-01

---

## Decision 1: Rotation storage format

**Decision**: Extend `SceneElement` with `rotation_attributes: readonly OriginAttribute[]` using keys `rotation.x`, `rotation.y`, `rotation.z` (Euler angles in radians).

**Rationale**: `OriginAttribute` is already a named numeric dimension (`{id, dimension_uri_key, dimension_uri_value}`). Euler angles are dimensioned numbers. Reusing the same type avoids a new structural category and keeps the JSON schema consistent. The keys `rotation.*` are parallel to `position.*` keys in `origin_attributes`.

**Alternatives considered**:
- Add a separate `QuaternionAttribute` type: rejected — quaternions are harder to inspect/edit and add schema complexity for this iteration.
- Add rotation to `origin_attributes` alongside position keys: rejected — conflating position and rotation in one array makes filtering harder and breaks conceptual grouping.
- Store rotation as degrees instead of radians: rejected — Three.js uses radians natively; conversion would be a persistent source of bugs.

---

## Decision 2: Gizmo mode toolbar UI approach

**Decision**: Implement `GizmoToolbar` as a plain DOM overlay (3 `<button>` elements) positioned absolutely inside the viewport container via inline CSS. No Tweakpane involvement.

**Rationale**: The toolbar is part of the 3D viewport interaction surface, not the property panel. Tweakpane is optimized for property bindings, not inline viewport controls. A plain DOM button group is simpler, directly styleable via the existing CSS, and stays well within the 150-LOC limit. It also keeps the Tweakpane dependency away from viewport internals.

**Alternatives considered**:
- Tweakpane `addButton` in the control pane: rejected — the pane is on the side panel; gizmo mode switching should be visually proximate to the viewport.
- `dat.GUI` or another UI lib: rejected — already committed to Tweakpane for property panels; introducing a second UI lib is unnecessary.
- HTML radio inputs: viable alternative, but `<button>` with ARIA role and active class is more composable.

---

## Decision 3: Project storage schema

**Decision**: Two localStorage keys:
1. `frameer3d.v1.projects` → `ProjectRegistry` (flat index: id + name + timestamps for all projects)
2. `frameer3d.v1.project.<id>` → `Project` (full project data including elements)

**Rationale**: Lazy per-project loading avoids deserializing all element data at startup. The registry is a small index for listing projects in the UI without loading full data. Individual project keys enable future migration (version bump per-key) without touching all projects at once.

**Alternatives considered**:
- Single key `frameer3d.v1.projects` containing all project + element data: rejected — as projects grow, startup cost scales linearly.
- IndexedDB: rejected — adds async complexity throughout the synchronous load chain; localStorage is sufficient for the current scope (single user, local-only).
- One key per element (keyed by element id): rejected — overly granular; transactional save is simpler at project level.

---

## Decision 4: URL routing mechanism

**Decision**: Use `?project=<id>` as a query string parameter. Read with `new URLSearchParams(window.location.search).get('project')`. Update URL without reload via `history.replaceState(null, '', '?project=<id>')`.

**Rationale**: Query strings are conventional for stateful resource identifiers. `replaceState` prevents polluting browser history on every project load/rename. Hash routing (`#project/<id>`) was considered but query params work more naturally with anchor links and don't interfere with in-page fragment navigation.

**Alternatives considered**:
- Hash routing `#project/<id>`: viable but less conventional; the `hashchange` event would add unnecessary complexity for a single-page app with no routing framework.
- Path routing `/project/<id>`: requires server-side support or a `rewrite` rule; localStorage is client-only so path routing adds infrastructure coupling.
- No URL routing (rely on localStorage "last active"): rejected — doesn't satisfy the requirement that the URL identifies the project, breaking bookmark/share use case.

---

## Decision 5: No migration; defensive parsing everywhere

**Decision**: The application is not deployed and has no existing user data to preserve. There is no legacy migration from `frameer3d.v1.elements`. Instead, all `localStorage` reads (registry, project, settings, layout) use strict type guards. Any missing, malformed, or corrupt data returns a sane default (empty registry, empty project, empty element array) and emits `console.warn`. `rotation_attributes` missing from an older in-flight element record defaults to `[0, 0, 0]` at read time.

**Rationale**: Since the app is not deployed there are no real users whose data needs to be preserved. Removing the migration path eliminates an entire module (`ProjectMigration.ts`), ~35 LOC, and the associated test file. Defensive parsing covers the same corrupted-storage scenarios without the complexity of one-shot migration code.

**Alternatives considered**:
- Legacy migration from `frameer3d.v1.elements`: removed — no deployed users, no value.
- Version-stamped schema bumps: deferred — not needed until the app ships.
- Crash on corrupt data: rejected — defensive defaults always emit a warning and continue, preventing white-screen failures during development.

---

## Decision 6: Rotation persistence in ElementPanel gizmo tracking

**Decision**: Extend the existing `onObjectChange` callback in `ElementPanel` to also read `mesh.rotation` (Euler) and update `rotation_attributes`, symmetrically with the existing `position` tracking for `origin_attributes`.

**Rationale**: The existing `onObjectChange` / `onDragEnd` pattern is already wired and tested. Adding rotation tracking inside the same callback (keyed on `rotation.*` attribute keys) requires no new event hooks. The `rotation_attributes` update mirrors the `origin_attributes` update, making the implementation and tests symmetric.

**Alternatives considered**:
- Separate `onRotationChange` event on the gizmo: unnecessary — Three.js `objectChange` fires on any transform change, including rotation.
- Store rotation as quaternion in `fixed_attributes` (non-editable): rejected — rotation should be persistent and inspectable.

---

## Decision 7: Module placement for project domain

**Decision**: Create `src/project/` domain with `ProjectTypes.ts`, `ProjectStore.ts`, `ProjectRouter.ts`, `index.ts`.

**Rationale**: Project management is a distinct domain from element rendering, scene management, and UI controls. The existing domain split (`elements/`, `scene/`, `layout/`, `system/`) establishes the precedent. `project/` owns: data types, localStorage CRUD, and URL routing.

**Alternatives considered**:
- Put project logic in `system/`: rejected — system/ currently owns theme/settings only; mixing project persistence there exceeds its scope.
- Single `ProjectManager.ts` flat file: would likely exceed 150 LOC given the type definitions + CRUD + router; splitting pre-emptively is cheaper.

---

## Decision 8: Scale mode in the gizmo toolbar

**Decision**: The GizmoToolbar exposes all three modes (Translate / Rotate / Scale) matching the existing `TransformMode` type. However, scale values are NOT persisted to the data model in this feature. Scale changes are visual-only (the mesh is visually scaled by Three.js while the gizmo is attached) and do not write back to any `SceneElement` attribute.

**Rationale**: Scale persistence would require a new `scale_attributes` addition to the data model, `ElementRenderer` changes, and additional PrimitiveFactory wiring — roughly equivalent scope to rotation, but not requested by the user for this iteration. The toolbar button is included because the `TransformMode` type already has `'scale'` and omitting the button creates an inconsistent UI.

**Alternatives considered**:
- Omit Scale button entirely: less ideal — the transform gizmo already supports scale and its absence would be surprising to users.
- Persist scale immediately: deferred; can be added as a follow-on task in the same feature or a separate spec.
