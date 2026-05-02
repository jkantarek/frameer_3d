# Tasks: Rotation of Objects & Project Management

**Input**: Design documents from `/specs/003-rotation-and-project-management/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api.md ✓, quickstart.md ✓

**TDD Policy**: TDD operates at the **task level**, not the feature layer. Each `F###` group is one logical concern. Within that group: `T001` writes the test (🔴 RED — must fail), `T002` implements it (🟢 GREEN — makes it pass), `T003` refactors (🔵 BLUE — optional, keep green). Complete one full RED→GREEN→BLUE cycle before opening the next `F###`. This prevents over-building.

**Organization**: Tasks are grouped by Phase → Feature group (F, one concern per group) → Task (T). IDs reset per level.

## ID Format: `P###F###T###`

| Segment | Meaning | Resets |
|---------|---------|--------|
| `P###` | Phase number (001, 002, …) | Never |
| `F###` | One logical concern within phase (001, 002, …) | Per phase |
| `T###` | Step within concern (T001=test, T002=impl, T003=refactor) | Per feature |

- **[P]**: Task can run in parallel (touches different files, no unresolved dependencies in the same phase)
- Include exact file paths in all task descriptions

---

## Phase 1 (P001): Setup — SceneElement Type Extension

**Purpose**: Add `rotation_attributes` to `SceneElement`. This is a breaking type change that causes TypeScript errors throughout the codebase; all fixture literals and spread sites must be updated before any US work begins.

### P001F001 — SceneElement rotation_attributes type change

- [x] P001F001T001 Update the `createBox` `@example` doctest in `src/elements/PrimitiveFactory.ts` to assert `rotation_attributes.length` equals 3 and keys `rotation.x`, `rotation.y`, `rotation.z` each have value `0` — `pnpm test` must **FAIL** (RED: field does not exist on SceneElement yet)
- [x] P001F001T002 Add `readonly rotation_attributes: readonly OriginAttribute[]` to the `SceneElement` interface in `src/elements/ElementTypes.ts`; then fix every TypeScript error caused by the missing field: update all object literal constructions and `{ ...el }` spreads in `src/elements/ElementStore.ts`, `src/elements/ElementStore.test.ts`, `src/elements/ElementPanel.test.ts`, `src/elements/ElementPanel.selection.test.ts`, `src/elements/ElementPanel.remove.test.ts`, `src/elements/ElementPanel.gizmo.test.ts`, `src/elements/ElementRenderer.test.ts`, `src/elements/ElementRenderer.color.test.ts`, `src/elements/ElementControls.test.ts` — add `rotation_attributes: []` to every fixture literal; run `pnpm typecheck && pnpm test` — must **PASS** (GREEN)

### Exit Criteria: Phase 1

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |

---

## Phase 2 (P002): Foundational — Project Domain

**Purpose**: Create the `src/project/` domain (types, storage CRUD, URL routing). These are pure modules with no UI dependencies; they must be complete before any project-aware UI or bootstrap work begins.

**⚠️ CRITICAL**: No User Story 2–4 work can begin until this phase is complete.

### P002F001 — ProjectTypes (pure type definitions)

- [x] P002F001T001 [P] Write an inline doctest in the (not-yet-created) `src/project/ProjectTypes.ts` file asserting that a `ProjectSummary`, `Project`, and `ProjectRegistry` object can each be constructed with correct field shapes — file does not exist yet, so `pnpm test` **FAILS** (RED)
- [x] P002F001T002 [P] Create `src/project/ProjectTypes.ts` with `ProjectSummary`, `Project` (extends `ProjectSummary`, adds `readonly elements: readonly SceneElement[]`), and `ProjectRegistry` (`readonly projects: readonly ProjectSummary[]`) interfaces as specified in `data-model.md` §2 — run `pnpm test` to confirm doctest passes (GREEN)

### P002F002 — ProjectStore (localStorage CRUD with injectable storage)

- [x] P002F002T001 [P] Write `src/project/ProjectStore.test.ts` with black-box unit tests for all 6 public functions using an injectable fake `Storage` object: `loadRegistry` (returns `{ projects: [] }` on missing key; returns `{ projects: [] }` + emits `console.warn` on corrupt JSON), `saveRegistry` (writes correct key), `loadProject` (returns `undefined` on missing; returns `{ ...project, elements: [] }` when stored elements lack `rotation_attributes`), `saveProject` (upserts summary in registry), `createProject` (produces a ULID id, default name `'Untitled Project'`, empty `elements`, valid `created_at`/`updated_at`), `deleteProject` (removes from registry and deletes project key) — `pnpm test` must **FAIL** (RED)
- [x] P002F002T002 [P] Create `src/project/ProjectStore.ts` implementing all 6 functions with `storage: Storage = localStorage` default parameter; all reads use strict type guards; corrupt data returns sane empty default + `console.warn`; `saveProject` normalises `rotation_attributes: []` on any element missing the field (defensive read path per data-model.md migration note) — run `pnpm test` (GREEN)

### P002F003 — ProjectRouter (URL ↔ project ID via injectable location/history)

- [x] P002F003T001 [P] Write `src/project/ProjectRouter.test.ts` with unit tests for `getActiveProjectId` (returns the `project` query param value when present, `undefined` when absent or blank), `setActiveProjectId` (calls `replaceState` with correct `?project=<id>` URL — use an injectable `history` object passed as optional parameter), `clearActiveProjectId` (removes the param) — `pnpm test` must **FAIL** (RED)
- [x] P002F003T002 [P] Create `src/project/ProjectRouter.ts` implementing `getActiveProjectId(location?: Location)`, `setActiveProjectId(id: string, history?: History)`, and `clearActiveProjectId(history?: History)` with injected-default parameters (`window.location` / `window.history`) for testability without mocks; use `URLSearchParams` and `history.replaceState` — run `pnpm test` (GREEN)

### P002F004 — project domain index

- [x] P002F004T001 Create `src/project/index.ts` re-exporting all public symbols from `ProjectTypes`, `ProjectStore`, and `ProjectRouter` (ProjectBootstrap will be added in P004)

### Exit Criteria: Phase 2

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

Additional constraints:
- All new `src/project/` files ≤ 150 non-comment lines
- JSDoc blocks contain ONLY `@example` blocks with `` ```ts @import.meta.vitest `` fences

---

## Phase 3 (P003): User Story 1 — Rotate a Scene Object via Gizmo (Priority: P1)

**Story Goal**: A user selects a mesh, switches gizmo to "Rotate" mode via a viewport toolbar, drags handles to rotate the object, and the rotation persists on reload.

**Independent test criteria**:  
Select a box → switch to rotate mode → `rotation_attributes` on element have non-zero Euler values → save fires → reload → `ElementRenderer` sets `mesh.rotation` from persisted values → object appears rotated.

### P003F001 — PrimitiveFactory rotation_attributes initialization

- [x] P003F001T001 Update all three factory function `@example` doctests in `src/elements/PrimitiveFactory.ts` (`createBox`, `createSphere`, `createCylinder`, `createPlane`) to additionally assert: `el.rotation_attributes.length === 3`, each of `rotation.x`, `rotation.y`, `rotation.z` has `dimension_uri_value === 0` — `pnpm test` must **FAIL** (RED: factories don't initialize `rotation_attributes` yet)
- [x] P003F001T002 Add `rotationAttrs()` helper returning 3 `OriginAttribute` entries (keys `rotation.x`, `rotation.y`, `rotation.z`, values `0`) in `src/elements/PrimitiveFactory.ts`; add `rotation_attributes: rotationAttrs()` to the returned objects of `createBox`, `createSphere`, `createCylinder`, and `createPlane` — run `pnpm test` (GREEN)

### P003F002 — ElementRenderer rotation sync

- [x] P003F002T001 [P] Write `src/elements/ElementRenderer.rotation.test.ts` asserting: after `sync()` with an element whose `rotation_attributes` have `rotation.x=1.0`, `rotation.y=0.5`, `rotation.z=0.3`, the corresponding Three.js mesh has `mesh.rotation.x ≈ 1.0`, `mesh.rotation.y ≈ 0.5`, `mesh.rotation.z ≈ 0.3`; also assert that `sync()` with empty `rotation_attributes: []` sets mesh rotation to 0/0/0 without throwing — `pnpm test` must **FAIL** (RED)
- [x] P003F002T002 [P] Add `getRotation(element: SceneElement, key: string): number` helper (returns `element.rotation_attributes.find(a => a.dimension_uri_key === key)?.dimension_uri_value ?? 0`) and call `mesh.rotation.set(getRotation(el,'rotation.x'), getRotation(el,'rotation.y'), getRotation(el,'rotation.z'))` inside the `syncElement` function in `src/elements/ElementRenderer.ts` — run `pnpm test` (GREEN)

### P003F003 — ElementPanel rotation capture in onObjectChange

- [x] P003F003T001 Update `src/elements/ElementPanel.gizmo.test.ts` to add an assertion that after the gizmo fires `objectChange` with `obj.rotation.x=0.7`, `obj.rotation.y=0.4`, `obj.rotation.z=0.2`, the saved element's `rotation_attributes` contains those values — `pnpm test` must **FAIL** (RED: capture doesn't exist yet)
- [x] P003F003T002 Extend the `onObjectChange` handler inside `createElementPanel` in `src/elements/ElementPanel.ts` to update `rotation_attributes` by mapping over `el.rotation_attributes` and substituting `dimension_uri_value` for each key (`rotation.x`, `rotation.y`, `rotation.z`) from `obj.rotation.{x,y,z}` per data-model.md §7; run `pnpm test` (GREEN)

### P003F004 — GizmoToolbar component

- [x] P003F004T001 [P] Write `src/scene/GizmoToolbar.test.ts` asserting: `createGizmoToolbar(container, gizmo)` appends a `div#gizmo-toolbar` with `role="toolbar"` inside `container`; the div contains exactly 3 `<button>` elements with `data-mode` of `translate`, `rotate`, `scale`; clicking the rotate button calls `gizmo.setMode('rotate')`; `translate` button starts with `aria-pressed="true"`, others `"false"`; calling `toolbar.setActiveMode('rotate')` updates `aria-pressed` correctly; `toolbar.dispose()` removes the `div#gizmo-toolbar` from `container` — `pnpm test` must **FAIL** (RED)
- [x] P003F004T002 [P] Create `src/scene/GizmoToolbar.ts` implementing `createGizmoToolbar(container, gizmo)` and `GizmoToolbarApi` (`setActiveMode`, `dispose`) per data-model.md §6; position div via inline CSS: `position:'absolute'`, `bottom:'1rem'`, `left:'50%'`, `transform:'translateX(-50%)'`, `zIndex:'10'`; set `aria-pressed` on click; track active mode to update `aria-pressed` on `setActiveMode` — run `pnpm test` (GREEN)

### P003F005 — ElementControls position + rotation folders

- [x] P003F005T001 Update `src/elements/ElementControls.test.ts`: change the `'bind(box) adds 6 children'` assertion from 6 to 8 (adds 1 Position folder + 1 Rotation folder); change `'bind twice keeps only 6 children'` to 8; add test asserting that changing a position input (proxy for `position.x`) fires `onChange` with the correct updated `origin_attributes` value; add test asserting that changing a rotation input (proxy for `rotation.x`) fires `onChange` with the correct updated `rotation_attributes` value (note: `createBox()` must already return `rotation_attributes` per P003F001T002, so this task depends on P003F001T002) — `pnpm test` must **FAIL** (RED)
- [x] P003F005T002 Update `src/elements/ElementControls.ts`: after the `fixed_attributes` loop, add a `positionFolder` (Tweakpane `addFolder({ title: 'Position' })`) and loop over `element.origin_attributes` to add one `addBinding` per attribute (step 0.01); on change, call `onChange` with `{ ...current, origin_attributes: current.origin_attributes.map(a => a.id === attr.id ? { ...a, dimension_uri_value: ev.value } : a) }`; add a `rotationFolder` (Tweakpane `addFolder({ title: 'Rotation' })`) and loop over `element.rotation_attributes` identically, updating `rotation_attributes` on change — run `pnpm test` (GREEN)

### P003F006 — Viewport CSS + main.ts GizmoToolbar wiring

- [x] P003F006T001 Verify `#viewport-container` in `src/style.css` has `position: relative` (required for the absolutely-positioned `#gizmo-toolbar` to anchor within the viewport); add `position: relative` to the `#viewport-container` CSS rule if absent
- [x] P003F006T002 Wire `createGizmoToolbar` in `src/main.ts`: import from `./scene/GizmoToolbar.js`; after the `viewportContainer` guard, call `createGizmoToolbar(viewportContainer, viewport.getTransformGizmo())`; run `pnpm typecheck && pnpm test` — must pass

### Exit Criteria: Phase 3 (User Story 1)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

Additional constraints:
- `src/scene/GizmoToolbar.ts` ≤ 150 non-comment lines
- JSDoc blocks ONLY `@example` blocks with `` ```ts @import.meta.vitest `` fences
- No `@ts-ignore` / `@ts-expect-error` without adjacent doctest

---

## Phase 4 (P004): User Stories 2 & 3 — Project Loading & Creation (Priority: P2)

**Story Goals**:  
- US2: User clicks "New Project" in System panel → URL changes to `?project=<ulid>` → empty canvas  
- US3: App boot reads `?project=<id>` → loads matching project; no param → creates new; corrupt data → empty default + warn

**Independent test criteria**:  
`resolveOrCreateProject()` returns a valid `Project` in all 4 scenarios (no URL, known ID, unknown ID, corrupt JSON). `ElementPanel` loads elements from `ProjectStore.loadProject(projectId)` and saves via `ProjectStore.saveProject(...)`. SystemPanel "New Project" button fires `onNewProject` callback. After wiring in `main.ts`, the full boot sequence resolves the project from URL.

### P004F001 — ProjectBootstrap (URL-driven boot resolver)

- [x] P004F001T001 Write `src/project/ProjectBootstrap.test.ts` covering 4 scenarios with injectable `storage` + injectable `location`/`history` optional parameters: (1) no `?project=` param → creates new project, calls `setActiveProjectId`, returns project with empty elements; (2) known project ID in storage → returns the stored project; (3) unknown project ID in URL but not in storage → returns fresh project with that exact ID; (4) corrupt JSON in storage for the project key → returns empty project with valid shape + `console.warn` was emitted — `pnpm test` must **FAIL** (RED)
- [x] P004F001T002 Create `src/project/ProjectBootstrap.ts` implementing `resolveOrCreateProject(storage?: Storage, location?: Location, history?: History): Project`; reads `getActiveProjectId(location)`; if absent → calls `createProject`, `saveProject`, `setActiveProjectId(id, history)`, returns new project; if present → calls `loadProject(id, storage)` and returns result (or fresh project with that id if undefined) — run `pnpm test` (GREEN)
- [x] P004F001T003 Update `src/project/index.ts` to re-export `resolveOrCreateProject` from `./ProjectBootstrap.js`

### P004F002 — ElementPanel accepts projectId (replaces ElementStore load/save)

- [x] P004F002T001 Update `src/elements/ElementPanel.test.ts` to pass a `projectId: 'test-project-id'` as the new 4th parameter to `createElementPanel`; use a fake `Storage` to assert that `ProjectStore.loadProject('test-project-id')` is used for initial element loading and `ProjectStore.saveProject(...)` is called on each commit instead of `ElementStore.save()` — `pnpm test` must **FAIL** (RED: `createElementPanel` doesn't accept `projectId` yet)
- [x] P004F002T002 Update `createElementPanel` signature in `src/elements/ElementPanel.ts` to add `projectId: string` as 4th parameter (before `transformGizmo?`); replace `load()` with `ProjectStore.loadProject(projectId) ?? { elements: [] }` for initial state; replace `save(state)` calls with `ProjectStore.saveProject({ ...project, elements: state.elements, updated_at: new Date().toISOString() })`; remove unused `load` and `save` imports from `ElementStore.js` (keep `addElement`, `removeElement`, `updateElement`); add `import { loadProject, saveProject } from '../project/index.js'` — run `pnpm test` (GREEN)
- [x] P004F002T003 Update all remaining `createElementPanel` call sites in test files (`src/elements/ElementPanel.selection.test.ts`, `src/elements/ElementPanel.remove.test.ts`, `src/elements/ElementPanel.gizmo.test.ts`) to pass a `projectId` string as the 4th argument; run `pnpm typecheck && pnpm test` — must pass

### P004F003 — SystemPanel New Project button + Projects folder

- [x] P004F003T001 Update `src/system/SystemPanel.test.ts` to call `createSystemPanel` with the new signature `(settings, projectRegistry, activeProjectId, callbacks?, container?)`; assert: a "Projects" folder is present; a "New Project" button is rendered; clicking it calls `onNewProject`; a text binding shows the active project name; `callbacks.onRenameProject` fires when the name binding changes — `pnpm test` must **FAIL** (RED: old signature)
- [x] P004F003T002 Update `createSystemPanel` in `src/system/SystemPanel.ts` with new signature per contracts/api.md §6: `(initialSettings, projectRegistry, activeProjectId, callbacks?, _container?)`; add a "Projects" Tweakpane folder containing: a text binding for the active project name (calls `callbacks?.onRenameProject`); a "New Project" button (calls `callbacks?.onNewProject`); run `pnpm test` (GREEN)

### P004F004 — main.ts project bootstrap wiring

- [x] P004F004T001 Update `src/main.ts` to: import `resolveOrCreateProject` from `./project/index.js`; call `const project = resolveOrCreateProject()` after `loadSettings()`; pass `project.id` as 4th argument to `createElementPanel` (moving `viewport.getTransformGizmo()` to 5th); update `createSystemPanel` call to new signature `(settings, loadRegistry(), project.id, { onThemeChange: ..., onNewProject: () => { ... }, onSelectProject: (id) => { ... }, onRenameProject: (id, name) => { ... } })`; `onNewProject` must call `createProject`, `saveProject`, `setActiveProjectId`, then `location.reload()`; run `pnpm typecheck && pnpm test` — must pass

### Exit Criteria: Phase 4 (User Stories 2 & 3)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

Additional constraints:
- `src/project/ProjectBootstrap.ts` ≤ 150 non-comment lines
- `src/system/SystemPanel.ts` ≤ 150 non-comment lines — if exceeded, extract Projects folder logic to `src/system/ProjectsFolder.ts`
- JSDoc blocks ONLY `@example` blocks with `` ```ts @import.meta.vitest `` fences

---

## Phase 5 (P005): User Story 4 — Switch Between Projects (Priority: P3)

**Story Goal**: The System panel shows all saved projects as navigation buttons. Clicking one updates the URL to `?project=<id>` and reloads, loading that project's elements.

**Independent test criteria**:  
Given a `ProjectRegistry` with 2 entries, `createSystemPanel` renders 2 navigation buttons; clicking one calls `onSelectProject('the-id')`. After wiring in `main.ts`, `onSelectProject` calls `setActiveProjectId(id)` + `location.reload()`.

### P005F001 — SystemPanel per-project navigation buttons

- [x] P005F001T001 Add assertions to `src/system/SystemPanel.test.ts`: given a `projectRegistry` with 2 `ProjectSummary` entries, the Projects folder renders 2 named buttons; clicking a button calls `onSelectProject(id)` with the correct project ID; the currently active project's button is visually distinguishable (e.g., bold label or `aria-current="true"`) — `pnpm test` must **FAIL** (RED: no per-project buttons yet)
- [x] P005F001T002 Add per-project navigation buttons inside the "Projects" folder in `src/system/SystemPanel.ts`: iterate `projectRegistry.projects`, add a Tweakpane button per project using the project name as label, on click call `callbacks?.onSelectProject?.(project.id)`; mark the active project (matching `activeProjectId`) with `aria-current="true"` on the button element — run `pnpm test` (GREEN)

### P005F002 — main.ts onSelectProject handler

- [x] P005F002T001 Update the `onSelectProject` callback in `src/main.ts` (wired in P004F004T001) to: call `setActiveProjectId(id)` then `location.reload()`; verify with `pnpm typecheck && pnpm test`

### Exit Criteria: Phase 5 (User Story 4)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

---

## Phase 6 (P006): Polish & Cross-Cutting Concerns

**Purpose**: Final validation pass — coverage gaps, lint, formatting, file-size audit.

### P006F001 — Coverage & quality gate pass

- [x] P006F001T001 [P] Run `pnpm typecheck` — fix any remaining TypeScript errors
- [x] P006F001T002 [P] Run `pnpm lint` — fix any remaining ESLint warnings (check `max-lines` on all new files; if `src/system/SystemPanel.ts` exceeds 150 non-comment lines, extract the Projects folder to `src/system/ProjectsFolder.ts`)
- [x] P006F001T003 [P] Run `pnpm test:coverage` — if any metric is below 98%, identify uncovered branches (likely defensive fallbacks in ProjectStore or ProjectBootstrap) and add targeted test cases; run until all thresholds pass

### Exit Criteria: Phase 6

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

---

## Dependencies

```
P001F001  (SceneElement type)
    └─→  P003F001  (PrimitiveFactory rotation init)
    └─→  P003F002  (ElementRenderer rotation sync)     ──[P]──┐
    └─→  P003F003  (ElementPanel rotation capture)            │  can run in parallel
    └─→  P003F004  (GizmoToolbar)                     ──[P]──┘
    └─→  P003F005  (ElementControls position+rotation)  ← depends on P003F001

P002F001  (ProjectTypes)
    └─→  P002F002  (ProjectStore)     ──[P]──┐
    └─→  P002F003  (ProjectRouter)    ──[P]──┘  can run in parallel after F001
         └─→  P004F001  (ProjectBootstrap)
              └─→  P004F002  (ElementPanel projectId)
              └─→  P004F003  (SystemPanel New Project)
                   └─→  P005F001  (SystemPanel project list)
         P004F001 + P004F002 + P004F003
              └─→  P004F004  (main.ts wiring)
                   └─→  P005F002  (main.ts onSelectProject)
                        └─→  P006F001  (Polish)
```

## Parallel Execution Opportunities

### Within Phase 2 (after P002F001):
- P002F002T001/T002 (ProjectStore) runs in parallel with P002F003T001/T002 (ProjectRouter)

### Within Phase 3 (after P001F001, P003F001):
- P003F002T001/T002 (ElementRenderer rotation) runs in parallel with P003F004T001/T002 (GizmoToolbar)
- P003F005T001/T002 (ElementControls) can run in parallel with P003F002 and P003F004 after P003F001T002 is GREEN

### Within Phase 6:
- P006F001T001/T002/T003 are independent validation gates

## Implementation Strategy — MVP Scope

**Suggested MVP (Phase 3 only)**: Deliver User Story 1 (rotation) independently before project management. Rotation is self-contained, immediately testable, and unblocks the highest-priority acceptance scenario (SC-001). Phases 4–5 can follow as a second increment.

**Full delivery order**: P001 → P002 → P003 → P004 → P005 → P006
