# Tasks: WebGL 3D Viewport + Control Pane Shell

**Input**: Design documents from `/specs/001-webgl-3d-viewport-control-pane/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/scene-api.md, research.md, quickstart.md

**TDD Policy**: TDD operates at the **task level**, not the feature layer. Each `F###` group is one logical concern (a single function, type, or component). Within that group: `T001` writes the test (🔴 RED — must fail), `T002` implements it (🟢 GREEN — makes it pass), `T003` refactors (🔵 BLUE — optional, keep green). Complete one full RED→GREEN→BLUE cycle before opening the next `F###`. This prevents over-building.

**Organization**: Tasks are grouped by Phase → Feature group (F, one concern per group) → Task (T). IDs reset per level.

## ID Format: `P###F###T###`

| Segment | Meaning | Resets |
|---------|---------|--------|
| `P###` | Phase number (001, 002, …) | Never |
| `F###` | One logical concern within phase (001, 002, …) | Per phase |
| `T###` | Step within concern (T001=test, T002=impl, T003=refactor) | Per feature |

Convention within every `F###` group:

- `T001` — Write test / doctest for this one concern. Run `pnpm test` → must FAIL.
- `T002` — Implement only what makes T001 pass. Run `pnpm test` → must PASS.
- `T003` — (Optional) Refactor. Run `pnpm test` → must still PASS.

**[P]**: Task can run in parallel (touches different files, no unresolved dependencies).

---

## Phase 1 (P001): Setup

**Purpose**: Install runtime dependencies, configure build tooling, and establish the full-screen HTML/CSS layout shell.

### P001F001 — Runtime Dependencies

- [x] P001F001T001 Run `pnpm add three opencascade.js tweakpane @tweakpane/plugin-essentials` and `pnpm add -D @types/three` and confirm all packages resolve in `package.json`

### P001F002 — Vite Configuration

- [x] P001F002T001 [P] Add `Cross-Origin-Resource-Policy: cross-origin` to `server.headers` and `preview.headers` in `vite.config.ts`; add `optimizeDeps: { exclude: ['opencascade.js'] }` to prevent Vite from pre-bundling the WASM artifact

### P001F003 — HTML + CSS Layout Shell

- [x] P001F003T001 [P] Replace `<canvas id="app">` in `index.html` with full DOM: `#viewport-container` (`flex: 2`) containing `<canvas id="viewport" role="img" aria-label="3D viewport">`; then `#drag-handle` (`role="separator" aria-orientation="vertical" aria-valuenow="0"`); then `#scene-controls` containing `<button id="toggle-pane" aria-expanded="false" aria-label="Toggle control pane">☰</button>` as its first child — this toggle button is required by P004F002/P004F003 and must exist in the DOM before any P004 wiring
- [x] P001F003T002 [P] Create `src/style.css` with full-screen flexbox layout: `body { display: flex; height: 100dvh; overflow: hidden; margin: 0 }`; `#viewport-container { flex: 2; position: relative; min-width: 0 }`; `canvas { width: 100%; height: 100%; display: block }`; `#scene-controls { flex: 0 0 var(--pane-width, calc(100vw / 3)); min-width: 200px; max-width: 50vw; overflow-y: auto }` — using `flex: 0 0 var(--pane-width, ...)` instead of `flex: 1` so P004's `DragHandle` can resize the pane by writing `--pane-width` via `style.setProperty`; `#scene-controls[data-collapsed="true"] { flex: 0 0 32px; min-width: 32px; overflow: hidden }` — required by P004F002 collapse toggle; `#drag-handle { width: 6px; cursor: col-resize; background: #333 }`; import `./style.css` in `src/main.ts`

### Exit Criteria: Phase 1

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |

---

## Phase 2 (P002): Foundational (Blocking Prerequisites)

**Purpose**: Core interfaces and pure data functions that all user stories depend on. Must be complete before Phase 3+.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### P002F001 — `SceneRenderer` Interface (GL boundary)

- [x] P002F001T001 Create `src/scene/SceneRenderer.ts` exporting `SceneRenderer` interface (`render(scene: Scene, camera: PerspectiveCamera): void`, `setSize(width: number, height: number): void`) imported from `three`; add compile-time structural compatibility doctest confirming that an object literal satisfying the interface compiles without error in `src/scene/SceneRenderer.ts`

### P002F002 — `LayoutState` Interface + Functions

- [x] P002F002T001 [P] Write black-box unit tests for `loadLayoutState`, `saveLayoutState`, and `defaultLayoutState` in `src/layout/LayoutState.test.ts` — tests: defaults returned when localStorage is empty; valid stored values round-trip correctly; invalid JSON input causes fallback to defaults; `paneWidth` out of range `[200, window.innerWidth * 0.5]` is clamped to nearest bound; non-boolean `paneCollapsed` falls back to `false`; `saveLayoutState` writes valid JSON to `localStorage`; `saveLayoutState` calls `console.warn` and does not throw when localStorage quota throws (use `vi.spyOn`)
- [x] P002F002T002 [P] Implement `LayoutState` interface, `defaultLayoutState(): LayoutState`, `loadLayoutState(): LayoutState`, and `saveLayoutState(state: LayoutState): void` in `src/layout/LayoutState.ts` — localStorage key `frameer3d.v1.layout`; all reads/writes wrapped in `try/catch`; validation uses `clamp` from `src/utils/math.ts`; failures call `console.warn` and return defaults

### Exit Criteria: Phase 2

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Checkpoint**: Foundation ready — `SceneRenderer` interface and `LayoutState` functions exist; user story implementation can now begin.

---

## Phase 3 (P003): User Story 1 — WebGL Viewport + Scene (Priority: P1) 🎯 MVP

**Goal**: The user opens the app and sees a Three.js 3D scene (`THREE.AxesHelper` on a dark `#1a1a2e` background) inside a GPU-accelerated WebGL viewport (left 2/3), with an empty Tweakpane control pane (right 1/3). Future workflow elements can inject `THREE.Object3D` subclasses into the scene via `SceneManager`.

**Independent Test**: `pnpm test` passes for `src/scene/SceneManager.test.ts`, `src/viewport/Viewport.test.ts`, and `src/controls/ControlPane.test.ts`; `pnpm dev` opens in Chrome showing a dark 3D viewport with XYZ axes helper and an empty Tweakpane pane; `AC1`, `AC4`, `AC5` from spec.md are met.

> **TDD Rule (task-level)**: Each F### group is ONE logical concern. Complete T001 (test RED) → T002 (impl GREEN) → T003 (refactor BLUE, optional) before opening the next group.

### P003F001 — `SceneManager` render loop + camera access

- [x] P003F001T001 Write black-box unit tests for `SceneManager` constructor, `renderFrame()`, `getCamera()`, and `setBackground()` in `src/scene/SceneManager.test.ts` — tests: `renderFrame()` calls `MockSceneRenderer.render(scene, camera)` exactly once; `getCamera()` returns the injected `THREE.PerspectiveCamera`; constructor creates an internal `THREE.Scene`; `setBackground('#1a1a2e')` causes the internal `THREE.Scene.background` to be a `THREE.Color` with hex value `0x1a1a2e`; define `MockSceneRenderer` as a local class implementing `SceneRenderer` in the test file — note: `setBackground` must be tested here (not deferred to P003F008) to satisfy 98% coverage and TDD ordering
- [x] P003F001T002 Implement `SceneManager` class (`constructor(renderer: SceneRenderer, camera: THREE.PerspectiveCamera)`, `renderFrame(): void`, `getCamera(): THREE.PerspectiveCamera`, `setBackground(color: THREE.ColorRepresentation): void`) in `src/scene/SceneManager.ts` — owns a `THREE.Scene` instance; `renderFrame` delegates to `renderer.render(this.scene, this.camera)`; `setBackground` sets `this.scene.background = new THREE.Color(color)`

### P003F002 — `SceneManager` object registry

- [x] P003F002T001 Extend tests in `src/scene/SceneManager.test.ts`: `addObject(id, obj)` adds object to the internal scene and is retrievable via `getObject(id)`; duplicate `id` replaces previous object and removes old one from scene; `addObject('')` throws `Error`; `removeObject(id)` removes from scene; `removeObject` is a no-op for an unknown id; `getObject(id)` returns `undefined` for unknown id
- [x] P003F002T002 Implement `addObject(id: string, object: THREE.Object3D): void`, `removeObject(id: string): void`, and `getObject(id: string): THREE.Object3D | undefined` in `src/scene/SceneManager.ts` using a `Map<string, THREE.Object3D>`

### P003F003 — `Viewport` Three.js setup (renderer + camera + OrbitControls)

- [x] P003F003T001 Write black-box unit tests for `createViewport` constructor behavior in `src/viewport/Viewport.test.ts` — tests: `createViewport` returns an object with `dispose()`, `getCamera()`, and `getSceneManager()` methods; `getCamera()` returns a `THREE.PerspectiveCamera` with `fov === 60`; `getSceneManager()` returns an object with `addObject` and `getCamera` functions (duck-type check — avoids circular import of `SceneManager` class in test); when a `rendererOverride` satisfying `SceneRenderer` is provided, the real `THREE.WebGLRenderer` is NOT instantiated; canvas `role` is set to `'img'` and `aria-label` to `'3D viewport'` after creation; use `document.createElement('canvas')` for the canvas — `getSceneManager()` must be tested here because P003F008 depends on it to wire `addObject` and `setBackground`
- [x] P003F003T002 Implement `createViewport(canvas: HTMLCanvasElement, rendererOverride?: SceneRenderer): { getCamera(): THREE.PerspectiveCamera; getSceneManager(): SceneManager; dispose(): void }` in `src/viewport/Viewport.ts` — when `rendererOverride` is absent, create `new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })` and call `renderer.setPixelRatio(window.devicePixelRatio)`; create `THREE.PerspectiveCamera(60, 1, 0.01, 1000)` and `OrbitControls` from `three/addons/controls/OrbitControls.js`; create `SceneManager(renderer, camera)`; set `canvas.role = 'img'` and `canvas.setAttribute('aria-label', '3D viewport')`

### P003F004 — `Viewport` RAF loop + Page Visibility API pause

- [x] P003F004T001 Extend tests in `src/viewport/Viewport.test.ts`: after calling `createViewport`, advancing `vi.useFakeTimers` through one RAF tick triggers `sceneManager.renderFrame()` exactly once; dispatching `visibilitychange` on `document` with `document.visibilityState` mocked to `'hidden'` stops RAF calls; restoring `'visible'` resumes RAF calls
- [x] P003F004T002 Implement RAF loop (`requestAnimationFrame` recursive loop calling `sceneManager.renderFrame()`) and `document.addEventListener('visibilitychange', ...)` pause/resume guard in `src/viewport/Viewport.ts`; `dispose()` cancels the pending RAF frame and removes the `visibilitychange` listener

### P003F005 — `Viewport` ResizeObserver + camera aspect update

- [x] P003F005T001 Extend tests in `src/viewport/Viewport.test.ts`: simulating a `ResizeObserver` callback with `contentRect: { width: 800, height: 400 }` causes `mockRenderer.setSize(800, 400)` to be called and `camera.aspect` to be set to `2` with `camera.updateProjectionMatrix()` invoked; use `vi.stubGlobal('ResizeObserver', ...)` to inject a controllable mock
- [x] P003F005T002 Implement `ResizeObserver` on the canvas parent element in `src/viewport/Viewport.ts`; callback calls `renderer.setSize(width, height, false)`, `camera.aspect = width / height`, `camera.updateProjectionMatrix()`; `dispose()` calls `resizeObserver.disconnect()`

### P003F006 — `ControlPane` singleton + plugin-essentials registration

- [x] P003F006T001 Write black-box unit tests for `createControlPane` in `src/controls/ControlPane.test.ts` — tests: `createControlPane(container)` returns an object satisfying `ControlPaneApi`; the returned `pane` property is a `Pane` instance from `tweakpane`; calling `createControlPane` does not throw in jsdom; use `document.createElement('div')` as the container
- [x] P003F006T002 Implement `createControlPane(container: HTMLElement): ControlPaneApi` in `src/controls/ControlPane.ts` — create `new Pane({ container })` from `tweakpane`; call `pane.registerPlugin(EssentialsPlugin)` from `@tweakpane/plugin-essentials`; return object implementing `ControlPaneApi` with `pane`, `addFolder`, and `dispose` properties

### P003F007 — `ControlPane` `addFolder` + `dispose`

- [x] P003F007T001 Extend tests in `src/controls/ControlPane.test.ts`: `addFolder('My Section')` returns a `FolderApi` (from tweakpane) without throwing; `dispose()` calls `pane.dispose()` — verify `pane` methods are inaccessible after dispose (tweakpane marks it disposed)
- [x] P003F007T002 Implement `addFolder(title: string): FolderApi` delegating to `pane.addFolder({ title })` and `dispose(): void` calling `pane.dispose()` in `src/controls/ControlPane.ts`

### P003F008 — `main.ts` US1 bootstrap

- [x] P003F008T001 Replace stub in `src/main.ts` with US1 bootstrap: query `#viewport` canvas and `#scene-controls` container; call `createViewport(canvas)` to get `{ getSceneManager(), getCamera(), dispose() }`; call `sceneManager.setBackground('#1a1a2e')` (method defined + tested in P003F001); call `sceneManager.addObject('axes', new THREE.AxesHelper(2))`; call `createControlPane(controlsContainer)` to get `controlPane`; delete placeholder test in `src/main.test.ts` (main.ts is excluded from coverage per `vitest.config.ts`); confirm `pnpm test` passes and `pnpm dev` in Chrome shows dark viewport with XYZ axes

### Exit Criteria: Phase 3 (US1)

All criteria MUST pass before this story is committed:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**ESLint contract constraints** (violations are lint errors — block the gate):
- All new source files ≤ 150 non-comment lines (`max-lines` rule)
- JSDoc blocks contain ONLY `@example` blocks with `` ```ts @import.meta.vitest `` fences (`local/jsdoc-examples-only`)
- No `@ts-ignore` / `@ts-expect-error` without an adjacent `@example` doctest
- No unused locals or parameters

**Checkpoint**: US1 fully functional — Three.js viewport renders `AxesHelper` on dark background, Tweakpane pane mounted, `SceneManager.addObject` verified by tests.

---

## Phase 4 (P004): User Story 2 — Layout Persistence + Collapse/Resize (Priority: P2)

**Goal**: The user can drag-resize the control pane (min 200 px, max 50 % window), toggle it collapsed/expanded, and both preferences survive a page reload via `localStorage`. All interactive controls carry correct ARIA attributes (`role="separator"`, `aria-valuenow`, `aria-expanded`).

**Independent Test**: `pnpm test` passes for `src/layout/DragHandle.test.ts`; dragging the handle resizes the pane via `--pane-width` CSS custom property; toggle button updates `aria-expanded` and collapses the pane; reload restores pane width and collapsed state (`AC2`, `AC3` from spec.md).

> **TDD Rule (task-level)**: Complete one full RED→GREEN→BLUE cycle per F### group before starting the next.

### P004F001 — `DragHandle` pane resize (pointer events + CSS clamp)

- [x] P004F001T001 Write black-box unit tests for `createDragHandle` pointer-drag behavior in `src/layout/DragHandle.test.ts` — tests: `pointerdown` on `handleEl` followed by `pointermove` with positive delta increases `--pane-width` CSS custom property on `paneEl`; width is clamped to `[200, window.innerWidth * 0.5]` (use `clamp` from `src/utils/math.ts`); `pointerup` ends the drag and saves state via `saveLayoutState`; use jsdom pointer events (`new PointerEvent(...)`) dispatched on `handleEl`
- [x] P004F001T002 Implement `createDragHandle(handleEl: HTMLElement, paneEl: HTMLElement, state: LayoutState): { dispose(): void }` in `src/layout/DragHandle.ts` — `pointerdown` calls `handleEl.setPointerCapture`; `pointermove` updates `paneEl.style.setProperty('--pane-width', ...)` and mutates `state.paneWidth` via `clamp`; `pointerup` calls `saveLayoutState(state)`; `dispose()` removes event listeners

### P004F002 — `DragHandle` toggle collapse

- [x] P004F002T001 Extend tests in `src/layout/DragHandle.test.ts`: clicking toggle button sets `state.paneCollapsed` to `true` and sets `data-collapsed="true"` attribute on `paneEl`; second click reverses to `false`; `saveLayoutState` is called after each toggle with the updated state
- [x] P004F002T002 Implement `createToggleButton(toggleEl: HTMLButtonElement, paneEl: HTMLElement, state: LayoutState): { dispose(): void }` in `src/layout/DragHandle.ts` — `click` handler toggles `state.paneCollapsed`, sets `paneEl.dataset.collapsed`, calls `saveLayoutState(state)`; `dispose()` removes listener

### P004F003 — `DragHandle` ARIA attributes

- [x] P004F003T001 Extend tests in `src/layout/DragHandle.test.ts`: after `createDragHandle`, `handleEl` has `role="separator"`, `aria-orientation="vertical"`, and `aria-valuenow` equal to the initial `state.paneWidth`; after a drag event, `aria-valuenow` updates to the new clamped width; after `createToggleButton`, `toggleEl` has `aria-expanded="false"` initially; clicking toggle changes it to `"true"`, and `aria-label` equals `"Toggle control pane"`
- [x] P004F003T002 Implement ARIA attribute initialization and updates in `src/layout/DragHandle.ts`: `createDragHandle` sets `handleEl.setAttribute('role', 'separator')`, `aria-orientation`, and initial `aria-valuenow`; `pointermove` updates `aria-valuenow`; `createToggleButton` sets `toggleEl.setAttribute('aria-expanded', ...)` and `aria-label="Toggle control pane"` on init and after each click

### P004F004 — `main.ts` US2 wiring

- [x] P004F004T001 Update `src/main.ts` to wire US2: call `loadLayoutState()` on startup; apply initial `--pane-width` CSS custom property to `#scene-controls` element; query `#drag-handle` and the toggle button element; call `createDragHandle(handleEl, paneEl, layoutState)` and `createToggleButton(toggleEl, paneEl, layoutState)`; apply `data-collapsed` attribute if `layoutState.paneCollapsed` is `true` on load (no test required — `src/main.ts` is excluded from coverage)

### Exit Criteria: Phase 4 (US2)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**ESLint contract constraints**: All new files ≤ 150 non-comment lines; JSDoc @example-only.

**Checkpoint**: US1 + US2 both independently tested and meeting all quality gates. Layout persists across reload.

---

## Phase 5 (P005): User Story 3 — OpenCASCADE.js WASM Loading (Priority: P3)

**Goal**: The OpenCASCADE.js WASM geometry kernel loads asynchronously at startup without blocking the 3D render loop. `loadOcct()` is idempotent (returns the same `GeometryKernel` on repeated calls). `isOcctLoaded()` returns `true` after the promise resolves. OCCT geometry calls are deferred to future workflow elements.

**Independent Test**: `pnpm test` passes for `src/occt/OccKernel.test.ts`; `pnpm dev` in Chrome shows no WASM load error in the console when COOP/COEP/CORP headers are present.

> **TDD Rule (task-level)**: Complete one full RED→GREEN→BLUE cycle per F### group before starting the next.

### P005F001 — `OccKernel` module

- [x] P005F001T001 Write black-box unit tests for `loadOcct` and `isOcctLoaded` in `src/occt/OccKernel.test.ts` — tests: `isOcctLoaded()` returns `false` before any call; calling `loadOcct()` twice in the same test resolves to the same object reference (idempotency); `isOcctLoaded()` returns `true` after `await loadOcct()` resolves; use `vi.mock('opencascade.js', () => ({ default: vi.fn().mockResolvedValue({ version: 'mock' }) }))` to avoid loading the real WASM
- [x] P005F001T002 Implement `GeometryKernel` interface (`readonly instance: OpenCascadeInstance`), `loadOcct(): Promise<GeometryKernel>`, and `isOcctLoaded(): boolean` in `src/occt/OccKernel.ts` — module-level `let occt: OpenCascadeInstance | null = null`; `loadOcct` calls `initOpenCascade()` from `opencascade.js` on first call and wraps the result in `GeometryKernel`; subsequent calls return the cached kernel immediately; `isOcctLoaded` returns `occt !== null`

### P005F002 — `main.ts` US3 wiring

- [x] P005F002T001 Update `src/main.ts` to call `loadOcct()` after the RAF loop is started (fire-and-forget, non-blocking); attach `.catch(err => console.warn('OCCT load failed:', err))` to handle WASM load failure gracefully (no test required — `src/main.ts` is excluded from coverage)

### Exit Criteria: Phase 5 (US3)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Checkpoint**: All three user stories functional, tested, and meeting quality gates.

---

## Phase 6 (P006): Polish & Cross-Cutting Concerns

**Purpose**: Final size audit, full quality-gate run, and end-to-end validation against `quickstart.md`.

### P006F001 — Code Quality + Size Audit

- [x] P006F001T001 [P] Audit all new source files for 150 non-comment line limit (`pnpm lint --max-warnings 0`); if any file approaches 130+ lines, refactor along domain boundaries defined in `specs/001-webgl-3d-viewport-control-pane/data-model.md` (e.g. split Viewport into `Viewport.ts` + `ViewportResize.ts` if needed)
- [x] P006F001T002 [P] Run full quality gate suite (`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:coverage`) and confirm all thresholds pass; fix any remaining lint, type, format, or coverage issues before proceeding

### P006F002 — Build + Quickstart E2E Validation

- [x] P006F002T001 Run `pnpm build` and confirm zero TypeScript + Vite bundle errors; verify `dist/` contains the WASM binary artifact from `opencascade.js` (check for `.wasm` file)
- [x] P006F002T002 Follow `specs/001-webgl-3d-viewport-control-pane/quickstart.md` end-to-end: `pnpm install && pnpm dev`; verify in Chrome: dark 3D viewport with XYZ AxesHelper, Tweakpane pane visible, drag-resize works, toggle collapse works, reload restores state, no console errors, canvas `role="img"` present in DevTools

### Exit Criteria: Phase 6 (Polish)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |
| Build | `pnpm build` | Zero errors |

---

## Global Quality Gates

These gates must pass at every phase boundary and before every commit:

| Gate | Command | Threshold |
|------|---------|----------|
| TypeScript strict compile | `pnpm typecheck` | Zero errors |
| ESLint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Prettier | `pnpm format:check` | All files formatted |
| Vitest (tests + doctests) | `pnpm test` | All pass |
| Coverage (lines/fns/branches/stmts) | `pnpm test:coverage` | ≥98% each metric |
| Build (final phase only) | `pnpm build` | Zero errors |

**Doctest contract** (enforced by `local/jsdoc-examples-only` ESLint rule):
- Every JSDoc block consists ONLY of `@example` blocks with `` ```ts @import.meta.vitest `` fences
- `@param`, `@returns`, `@description` prose in JSDoc = lint error
- These examples are executed as live tests on every `pnpm test` run

---

## Dependencies & Execution Order

### Phase Dependencies

```
P001 (Setup)
  └─► P002 (Foundational)
        └─► P003 (US1 — WebGL Viewport + Scene) ──────────► P006 (Polish)
              └─► P004 (US2 — Layout Persistence)  ───────► P006
              └─► P005 (US3 — OccKernel) [parallel w/ P004] ► P006
```

- **P001**: No dependencies — start immediately
- **P002**: Depends on P001 — BLOCKS all user stories
- **P003**: Depends on P002 — `SceneRenderer` interface + `LayoutState` must exist
- **P004**: Depends on P003 — `DragHandle` integrates with `main.ts` wired in P003F008
- **P005**: Depends on P002 — can begin in parallel with P004 after P003 is complete
- **P006**: Depends on P003 + P004 + P005 all complete

### Parallel Execution Opportunities

**Within P002 (Foundational)**:
- `P002F001` (SceneRenderer — `src/scene/SceneRenderer.ts`) and `P002F002` (LayoutState — `src/layout/LayoutState.ts`) touch independent files — can run in parallel once P001 is done

**Within P003 (US1)**:
- `P003F001`+`P003F002` (SceneManager) and `P003F006`+`P003F007` (ControlPane) touch independent files — can run in parallel
- `P003F003`–`P003F005` (Viewport) must run sequentially (same source + test file)

**Between P004 and P005**:
- After P003 is GREEN, `P004` (DragHandle) and `P005` (OccKernel) touch independent files and can be implemented in parallel

### MVP Scope

The **minimum viable demonstration** is completing Phases 1–3 (P001 + P002 + P003):

- `pnpm test` all passing with ≥98% coverage
- `pnpm dev` in Chrome shows dark 3D viewport with XYZ AxesHelper + empty Tweakpane pane
- `SceneManager.addObject` injects objects visible in the rendered scene
- All public APIs have zero `any` types and pass strict TypeScript

Phases 4–6 extend this with pane persistence, accessibility, WASM kernel, and production-build readiness.
