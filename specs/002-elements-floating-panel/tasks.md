# Tasks: Elements Floating Panel — UI Improvements

**Feature**: `002-elements-floating-panel`
**Date**: 2026-04-30 (updated 2026-05-01 with bug-fix phases P019–P021)
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)
**Completed**: P001–P018 (full feature implemented) | **Remaining**: P019–P021 (bug fixes)

**TDD Policy**: TDD operates at the **task level**, not the feature layer. Each `F###` group is one logical concern. Within that group: `T001` writes the test (🔴 RED — must fail), `T002` implements it (🟢 GREEN — makes it pass), `T003` refactors (🔵 BLUE — optional). Complete one full RED→GREEN→BLUE cycle before opening the next `F###`. This prevents over-building.

**Organization**: Tasks are grouped by Phase → Feature group (F, one concern per group) → Task (T). IDs reset per level.

## ID Format: `P###F###T###`

| Segment | Meaning | Resets |
|---------|---------|--------|
| `P###` | Phase number (001, 002, …) | Never |
| `F###` | One logical concern within phase (001, 002, …) | Per phase |
| `T###` | Step within concern (T001=test, T002=impl, T003=refactor) | Per feature |

- **[P]**: Task can run in parallel (touches different files, no unresolved dependencies at execution time)
- Include exact file paths in all task descriptions

---

## Phase 1 (P001): Setup — Dependencies, CSS Overlay, Domain Scaffold

**Purpose**: Install `ulid`, add CSS overlay rules for the panel, create `src/elements/` domain scaffold. No user behaviour to TDD in this phase — T001 is the implementation itself.

### P001F001 — Install `ulid` dependency

- [x] P001F001T001 Run `pnpm add ulid` to add `ulid` to `dependencies` in `package.json` and confirm the entry appears (MIT, ~2.5 KB, zero deps, browser-safe via `crypto.getRandomValues`)

### P001F002 — CSS overlay rules for `#elements-panel`

- [x] P001F002T001 [P] Add `position: relative` to the existing `#viewport-container` rule in `src/style.css`

### P001F003 — Domain scaffold

- [x] P001F003T001 [P] Create `src/elements/index.ts` as an empty placeholder (`export {};`) to establish the domain module entry point

### Exit Criteria: Phase 1

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |

---

## Phase 2 (P002): Foundation — `ElementTypes`

**Purpose**: Declare all shared types for the `elements` domain. These are pure TypeScript type declarations — the TypeScript compiler validates them; downstream module tests provide runtime coverage of the shapes.

### P002F001 — `ElementTypes` declarations

- [x] P002F001T001 Create `src/elements/ElementTypes.ts` with all 6 `readonly` type/interface declarations matching `contracts/elements-api.md` exactly: `AttributeType` (union `'number' | 'string' | 'boolean' | 'color' | 'select'`), `ParametricAttribute` (`id`, `attribute_uri_key`, `attribute_value`, `attribute_type`), `FixedAttribute` (`id`, `attribute_uri_key`, `attribute_value`), `OriginAttribute` (`id`, `dimension_uri_key`, `dimension_uri_value: number`), `SceneElement` (recursive `readonly child_elements: readonly SceneElement[]`), `ElementStoreData` (`readonly elements: readonly SceneElement[]`) — all properties `readonly` per contract

### Exit Criteria: Phase 2

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |

**Checkpoint**: Types compile — all downstream modules can import from `ElementTypes.ts`.

---

## Phase 3 (P003): User Story 1 — Create and Persist Primitive Elements (Priority: P1) 🎯 MVP

**Goal**: Pure data layer — `ElementStore` (localStorage persistence) and `PrimitiveFactory` (ULID-identified primitives) fully implemented and tested. No DOM or Three.js dependencies. After this phase, elements can be created and persisted entirely in isolation.

**Independent Test**: Run `pnpm test -- ElementStore PrimitiveFactory`. Verify: `load()` returns `{elements:[]}` on first run; `save()` + `load()` round-trips without data loss; `addElement()` appends at top level; `removeElement()` deep-removes by id; `findElement()` recurses into `child_elements`; `createBox()` produces a `SceneElement` with `fixed_attributes` entry `{attribute_uri_key:'geometry.type', attribute_value:'box'}`, 3 parametric attributes, and a 26-character ULID `id`.

> **TDD Rule**: Each F### group is ONE concern. Complete T001 (🔴 RED — must fail) → T002 (🟢 GREEN — passes) → T003 (🔵 BLUE — optional) before opening the next group.

### P003F001 — `ElementStore` load / save

- [x] P003F001T001 Write `src/elements/ElementStore.test.ts`: test `load()` with absent `localStorage` key → returns `{elements:[]}` (call `localStorage.clear()` inside the `it` block before importing); test `load()` with valid pre-seeded JSON → returns parsed `ElementStoreData`; test `load()` with corrupt JSON string → returns `{elements:[]}` and calls `console.warn` (spy via `vi.spyOn(console, 'warn')`); test `save()` stores the serialised data under key `'frameer3d.v1.elements'`; test `save()` with an injected fake `Storage` whose `setItem` throws `DOMException('QuotaExceededError')` → `console.warn` called, no exception propagates (to cover the error branch without monkey-patching `window.localStorage`, have `save` accept an optional `storage: Storage = localStorage` parameter)
- [x] P003F001T002 Implement `load(storage: Storage = localStorage): ElementStoreData` and `save(data: ElementStoreData, storage: Storage = localStorage): void` in `src/elements/ElementStore.ts`; `load` wraps `JSON.parse` in try-catch (returns `{elements:[]}` + `console.warn` on failure); `save` wraps `storage.setItem` in try-catch for `QuotaExceededError` (logs via `console.warn`, silently skips save); use storage key constant `'frameer3d.v1.elements'`

### P003F002 — `ElementStore` mutation functions

- [x] P003F002T001 Add tests to `src/elements/ElementStore.test.ts` for `addElement(data, el)` (appends to `data.elements`; original `data` reference is unchanged — immutability), `removeElement(data, id)` (removes flat element by id; removes element nested in `child_elements` recursively; no-op returning original data when id not found), `updateElement(data, updated)` (replaces top-level match by id with `updated`; replaces recursively inside `child_elements`; no-op when id not found), `findElement(data, id)` (returns top-level match; returns recursively nested match; returns `undefined` when missing)
- [x] P003F002T002 Implement `addElement`, `removeElement`, `updateElement`, `findElement` in `src/elements/ElementStore.ts` using immutable-update pattern (spread `{...data, elements: [...]}` — never mutate input); `removeElement` and `updateElement` recurse via mapping `child_elements` through the same operation; `findElement` uses depth-first traversal; all array access guarded against `noUncheckedIndexedAccess` (use `Array.find`, `for...of`, not numeric index access)

### P003F003 — `PrimitiveFactory`

- [x] P003F003T001 [P] Add inline doctests (`@example` block with `` ```ts @import.meta.vitest `` fence) to `src/elements/PrimitiveFactory.ts` for each of the three factory functions (stubs only — functions not yet implemented, so doctests are 🔴 RED): `createBox()` doctest verifies `el.id.length === 26`, `el.fixed_attributes.find(a => a.attribute_uri_key === 'geometry.type')?.attribute_value === 'box'`, `el.parametric_attributes.length === 3`, `el.origin_attributes.length === 3`, `el.label === 'Box'`; `createSphere()` doctest verifies `geometry.type === 'sphere'`, `parametric_attributes.length === 1`, `el.label === 'Sphere'`; `createCylinder()` doctest verifies `geometry.type === 'cylinder'`, `parametric_attributes.length === 2`, `el.label === 'Cylinder'`; also verify custom `label` parameter overrides default when provided
- [x] P003F003T002 [P] Implement `createBox(label?: string): SceneElement`, `createSphere(label?: string): SceneElement`, `createCylinder(label?: string): SceneElement` in `src/elements/PrimitiveFactory.ts` using `import { ulid } from 'ulid'`; each factory generates ULID ids for the element and all attribute entries; pre-populate `parametric_attributes`, `fixed_attributes`, `origin_attributes` per `data-model.md` defaults (box: width=`"1"`, height=`"1"`, depth=`"1"`, type=`"box"`, position.x/y/z=0; sphere: radius=`"1"`, type=`"sphere"`, position.x/y/z=0; cylinder: radius=`"0.5"`, height=`"2"`, type=`"cylinder"`, position.x/y/z=0); `description` defaults to empty string; `child_elements` defaults to `[]`

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
- `ElementStore.ts` and `PrimitiveFactory.ts` ≤ 150 non-comment lines
- JSDoc blocks use only `@example` blocks with `` ```ts @import.meta.vitest `` fences
- No `@ts-ignore` / `@ts-expect-error` without adjacent `@example` doctest
- No unused locals or parameters

**Checkpoint**: Data layer complete — elements can be created, stored, retrieved, and mutated in isolation without DOM or Three.js.

---

## Phase 4 (P004): User Story 2 — Render Elements in 3D Scene (Priority: P2)

**Goal**: `ElementStoreData` is mirrored in the Three.js scene. Adding, removing, or updating elements in the store is reflected in mesh presence and geometry. No DOM or UI awareness.

**Independent Test**: Run `pnpm test -- ElementRenderer`. Create a box via `createBox()`, build `ElementStoreData` with it, call `renderer.sync(data)`, verify `sceneManager.getObject(box.id)` returns a `THREE.Mesh` (`instanceof THREE.Mesh`). Remove the element: call `renderer.sync({elements:[]})`, verify `sceneManager.getObject(box.id) === undefined`.

> **TDD Rule**: Complete one full RED→GREEN→BLUE cycle per F### group.

### P004F001 — `ElementRenderer` sync

- [x] P004F001T001 Write `src/elements/ElementRenderer.test.ts`: declare a `MockSceneRenderer` class implementing `SceneRenderer` (same pattern as `src/scene/SceneManager.test.ts` — tracks `render`/`setSize` calls, no WebGL needed); create a real `SceneManager(new MockSceneRenderer(), new THREE.PerspectiveCamera())` and inject it into `createElementRenderer(sm)`; test `createElementRenderer(sm)` returns object with `sync`; test `sync({elements:[]})` leaves no objects added to `sm`; test `sync` with a box element → `sm.getObject(el.id)` is `instanceof THREE.Mesh`; test `sync` with sphere element → `THREE.SphereGeometry`-backed mesh; test `sync` with cylinder element → `THREE.CylinderGeometry`-backed mesh; test second `sync` call without element removes mesh (`getObject` returns `undefined`); test `sync` with element in `child_elements` → child mesh accessible via `sm.getObject(child.id)`; test `sync` with updated element (changed `geometry.width`) → old mesh replaced (distinct object reference)
- [x] P004F001T002 Implement `createElementRenderer(sceneManager: SceneManager): ElementRendererApi` and `sync(data: ElementStoreData): void` in `src/elements/ElementRenderer.ts`; maintain a `Set<string>` (`renderedIds`) of currently-rendered element ids; on each `sync` call: compute ids to remove (in `renderedIds` but not in new data — use depth-first traversal to collect all current ids), compute ids to add/update (all ids in new data), remove stale meshes via `sceneManager.removeObject(id)`, add/replace meshes for each element; build geometry by finding the attribute with `attribute_uri_key === 'geometry.type'` in `element.fixed_attributes` via `Array.find` (not index access due to `noUncheckedIndexedAccess`): `"box"` → `new BoxGeometry(w, h, d)` reading `geometry.width/height/depth` from `parametric_attributes`, `"sphere"` → `new SphereGeometry(r, 32, 16)`, `"cylinder"` → `new CylinderGeometry(r, r, h, 32)`; read numeric values via `Number(attr.attribute_value)`; set `mesh.position.set(x, y, z)` from `origin_attributes` where `dimension_uri_key` is `'position.x'`, `'position.y'`, `'position.z'`; use `new THREE.MeshStandardMaterial()` as default material; recurse into `element.child_elements`; update `renderedIds` after sync

### Exit Criteria: Phase 4 (US2)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**ESLint contract constraints**: `ElementRenderer.ts` ≤ 150 non-comment lines.

**Checkpoint**: Scene rendering pipeline complete — elements in the store are reflected as Three.js meshes; the data → scene flow is fully tested.

---

## Phase 5 (P005): User Story 3 — Browse and Add Elements via Panel (Priority: P3)

**Goal**: User sees a `#elements-panel` overlay anchored to the left edge of the viewport displaying a scrollable element list, and a "+" button that opens an inline primitive picker (Box / Sphere / Cylinder). Selecting a type creates the element, persists it, re-renders the list, and syncs the scene. No control-pane selection binding yet (added in P006).

**Independent Test**: Run `pnpm test -- ElementPanel`. Create panel in jsdom container; verify `getElement().id === 'elements-panel'` and element is a child of container; pre-seed localStorage with one box element, create panel, verify list has 1 row with label `'Box'`; click "+", verify picker shows 3 buttons; click "Box", verify list now has 2 rows and `sceneManager.getObject(newId)` returns a mesh.

> **TDD Rule**: Complete one full RED→GREEN→BLUE cycle per F### group.

### P005F001 — `ElementPanel` DOM scaffold + factory

- [x] P005F001T001 Write `src/elements/ElementPanel.test.ts`: declare a `MockSceneRenderer` (implements `SceneRenderer`; same pattern as `SceneManager.test.ts`) and create a real `SceneManager(new MockSceneRenderer(), new THREE.PerspectiveCamera())`; create a real Tweakpane `FolderApi` via `new Pane({container: document.createElement('div')}).addFolder({title:'Element'})`; clear `localStorage` via `localStorage.clear()` inside each `it` block (not in `beforeEach`); test `createElementPanel(div, sm, folder)` returns an object with `getElement()` and `dispose()`; `getElement()` returns an `HTMLElement` with `id === 'elements-panel'`; that element is a descendant of `div`; `dispose()` removes the panel element from `div`
- [x] P005F001T002 Implement `createElementPanel(container: HTMLElement, sceneManager: SceneManager, controlFolder: FolderApi): ElementPanelApi` in `src/elements/ElementPanel.ts`; create a `<div id="elements-panel">` and append to `container`; import and call `createElementRenderer(sceneManager)` — store as `renderer`; load initial state via `load()` and call `renderer.sync(state)`; create an empty `<ul id="elements-list">` inside the panel div; return `{ getElement(): panel, dispose(): void }` — `dispose` removes the panel div from container; **do not import `ElementControls` yet** (controls wiring is added in P006)

### P005F002 — Element list rendering

- [x] P005F002T001 Add tests to `src/elements/ElementPanel.test.ts` for list rendering: pre-seed `localStorage` with `{elements:[boxEl, sphereEl]}` (two pre-built elements) before calling `createElementPanel`; verify `getElement().querySelectorAll('li').length === 2`; verify each `<li>` has `data-id` attribute matching the element's id; verify `<li>` text content includes the element's `label`; test with a nested element (`child_elements` non-empty): child `<li>` present with `data-depth="1"` attribute
- [x] P005F002T002 Implement element list rendering in `src/elements/ElementPanel.ts`: add a `renderList(state, listEl)` helper that clears `listEl.innerHTML` and appends one `<li data-id="..." data-depth="0">label</li>` per top-level element; recursively append child elements with incremented depth; call `renderList` once after panel creation with the initial state; update the `state` reference and call `renderList` after each store mutation (add/update)

### P005F003 — "+" button and primitive picker

- [x] P005F003T001 Add tests to `src/elements/ElementPanel.test.ts` for "+" button and picker: after `createElementPanel`, query `#elements-add-btn` — verify it exists inside `#elements-panel`; simulate click on `#elements-add-btn` → query `#elements-picker` — verify it is visible and contains 3 buttons with text `'Box'`, `'Sphere'`, `'Cylinder'`; simulate click on `'Box'` → `#elements-picker` is hidden; `#elements-list` now has 1 row; `localStorage.getItem('frameer3d.v1.elements')` parses to data with `elements.length === 1`; `sceneManager.getObject(newId)` is `instanceof THREE.Mesh` where `newId` is the id from the stored element; repeat for `'Sphere'` and `'Cylinder'` (separate `it` blocks)
- [x] P005F003T002 Implement "+" button and picker in `src/elements/ElementPanel.ts`: append `<button id="elements-add-btn">+</button>` to the panel div; append `<div id="elements-picker" hidden>` containing three `<button>` elements labelled `Box`, `Sphere`, `Cylinder`; **define a private `commit(newState: ElementStoreData): void` closure helper** inside `createElementPanel` that does: `state = newState; save(state); renderer.sync(state); renderList(state, listEl);` — this helper centralises the 4-step coordination so every mutation calls `commit(...)` rather than repeating the steps inline; on "+" click toggle `hidden` attribute on picker; on each type-button click: call `createBox()` / `createSphere()` / `createCylinder()`, then call `commit(addElement(state, el))` and hide picker; import `createBox`, `createSphere`, `createCylinder` from `./PrimitiveFactory.js` and `addElement`, `save` from `./ElementStore.js`

### Exit Criteria: Phase 5 (US3)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**ESLint contract constraints**: `ElementPanel.ts` ≤ 150 non-comment lines.

**Checkpoint**: Panel UI complete — user can see elements in the list and add new primitives; meshes appear in the 3D scene immediately.

---

## Phase 6 (P006): User Story 4 — Edit Element Attributes via Control Pane (Priority: P4)

**Goal**: Clicking an element row in the panel binds its `parametric_attributes` to Tweakpane inputs and `fixed_attributes` to read-only monitors in the "Element" folder. Changing a binding value updates the element in the store and re-syncs the scene.

**Independent Test**: Run `pnpm test -- ElementControls`. Create `createElementControls(folder)` with a real `FolderApi`; bind a box element; verify `folder.children.length === parametric_attributes.length + fixed_attributes.length` (3 + 1 = 4); change a parametric value → `onChange` called with `SceneElement` whose matching `attribute_value` reflects the new value; call `clear()` → `folder.children.length === 0`.

> **TDD Rule**: Complete one full RED→GREEN→BLUE cycle per F### group.

### P006F001 — `ElementControls` bind / clear

- [x] P006F001T001 Write `src/elements/ElementControls.test.ts`: create a real Tweakpane `Pane` in a jsdom `div` and call `pane.addFolder({title:'Element'})` to get a real `FolderApi`; test `createElementControls(folder)` returns `{bind, clear}`; test `clear()` on an empty folder is a no-op (no throw); test `bind(createBox(), onChange)` adds `4` children to folder (3 parametric + 1 fixed: box has 3 parametric_attributes + 1 fixed_attribute); test `clear()` after bind → `folder.children.length === 0`; test that simulating a Tweakpane binding change (set proxy value, trigger `pane.refresh()`) causes `onChange` to be called with an updated `SceneElement` containing the new `attribute_value`; test `bind` clears existing children before adding new ones (call bind twice, folder still has only 4 children)
- [x] P006F001T002 Implement `createElementControls(folder: FolderApi): ElementControlsApi` in `src/elements/ElementControls.ts`; `clear()` disposes all children: `[...folder.children].forEach(b => b.dispose())`; `bind(element, onChange)` calls `clear()` first, then for each `parametric_attribute` builds a mutable proxy object `{ [attr.attribute_uri_key]: coercedValue }` where `coercedValue` is `Number(v)` for `'number'`, `v === 'true'` for `'boolean'`, `v` for `'string'`, `v` for `'color'`, and parses JSON array for `'select'`; calls `folder.addBinding(proxy, attr.attribute_uri_key, bindingOptions(attr.attribute_type))` with `{ step: 0.01 }` for `'number'`, `{ view: 'color' }` for `'color'`, `{}` otherwise; on binding change event reconstructs updated `SceneElement` with the new `attribute_value` serialised back to string and calls `onChange(updatedElement)`; for each `fixed_attribute` calls `folder.addBinding({[attr.attribute_uri_key]: attr.attribute_value}, attr.attribute_uri_key, { readonly: true })` as a read-only monitor

### P006F002 — Wire selection in `ElementPanel`

- [x] P006F002T001 Add tests to `src/elements/ElementPanel.test.ts` for selection: after creating panel with one pre-seeded box element, simulate click on the `<li>` row; verify the row receives `aria-selected="true"`; verify `folder.children.length > 0` (controls bound); simulate click on a different row (with two pre-seeded elements) → first row loses `aria-selected`, second gains it, folder rebound to second element; simulate control binding `onChange` callback (call the callback directly captured from the controls mock / real binding interaction) → `sceneManager.getObject(id)` returns an updated mesh after `renderer.sync`
- [x] P006F002T002 Extend `src/elements/ElementPanel.ts` to add selection: import `createElementControls` from `./ElementControls.js`; call `createElementControls(controlFolder)` inside `createElementPanel` — store as `controls`; in `renderList`, attach a `click` event listener on each `<li>`: on click, remove `aria-selected` from all rows, set `aria-selected="true"` on clicked row, find the element by `data-id` in `state` via `findElement(state, id)`, call `controls.bind(foundElement, (updated) => commit(updateElement(state, updated)))` — reusing the `commit()` helper defined in P005F003T002; update `dispose()` to call `controls.clear()`; import `findElement`, `updateElement` from `./ElementStore.js`

### P006F003 — `index.ts` definitive re-exports (all at once)

- [x] P006F003T001 [P] Write the complete `src/elements/index.ts` in a single pass — **all** public symbols from all 6 modules at once (no prior partial writes needed; no test file imports from this file so it is safe to defer until here): `export type { AttributeType, ParametricAttribute, FixedAttribute, OriginAttribute, SceneElement, ElementStoreData }` from `./ElementTypes.js`; `export { load, save, addElement, removeElement, updateElement, findElement }` from `./ElementStore.js`; `export { createBox, createSphere, createCylinder }` from `./PrimitiveFactory.js`; `export { createElementRenderer }` and `export type { ElementRendererApi }` from `./ElementRenderer.js`; `export { createElementControls }` and `export type { ElementControlsApi }` from `./ElementControls.js`; `export { createElementPanel }` and `export type { ElementPanelApi }` from `./ElementPanel.js`; run `pnpm typecheck` to confirm all re-exported symbols resolve correctly

### Exit Criteria: Phase 6 (US4)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**ESLint contract constraints**: `ElementControls.ts` ≤ 150 non-comment lines; `ElementPanel.ts` ≤ 150 non-comment lines after extension.

**Checkpoint**: Full elements feature complete in isolation — creating, viewing, and editing element attributes all work and are verified with 98%+ coverage.

---

## Phase 7 (P007): Integration — Wire into `main.ts`

**Purpose**: Connect the `elements` domain into the application entry point. `src/main.ts` is excluded from coverage (`vitest.config.ts` `exclude` list), so no TDD cycle — wiring only.

### P007F001 — `main.ts` integration wiring

- [x] P007F001T001 Update `src/main.ts`: capture the return value of `createControlPane(controlsContainer, layoutState)` into `const controlPane`; add `const elementFolder = controlPane.addFolder('Element')` to get the `FolderApi` for element attribute bindings; add `const viewportContainer = canvas.parentElement` with an `instanceof HTMLElement` guard (throw if not); call `createElementPanel(viewportContainer, sceneManager, elementFolder)` imported as a named export from `'./elements/index.js'`; run `pnpm typecheck` and `pnpm lint` to verify zero errors; smoke-test in browser via `pnpm dev` to confirm `#elements-panel` appears on the left edge of the 3D viewport, "+" button creates primitives visible in the scene, and selecting an element opens controls in the Tweakpane pane

### Exit Criteria: Phase 7 (Integration)

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

**Final checkpoint**: Full feature integrated and live — `#elements-panel` mounts correctly, primitives can be added, Three.js meshes appear in the scene, and selecting an element exposes its editable attributes in the Tweakpane "Element" folder.

---

## Phase 8 (P008): Panel Tweakpane Migration + Basic Remove — COMPLETE ✅

**Goal**: Replace `<ul>/<li>` element list with Tweakpane `Pane`/`FolderApi` buttons.
Add a panel-level Remove button (`#elements-remove-btn`). Add `no-raw-html` ESLint rule.

> All P008 tasks are complete in the current working tree (reflected in `git diff HEAD`).
> The `+` button is currently positioned **above** the scene list — P009 relocates it.

- [x] P008F001T001 Add `no-raw-html` ESLint rule source to `eslint-rules/no-raw-html.mjs`
- [x] P008F001T002 Register `local/no-raw-html` in `eslint.config.mjs` with exception for `ElementPanel.ts` and test files; add Tweakpane reference docs note to `AGENTS.md`
- [x] P008F002T001 Update `src/elements/ElementPanel.test.ts` and `src/elements/ElementPanel.selection.test.ts` to use `[data-element-id]` attribute selectors instead of `<li>` selectors (RED — old selectors fail against new Pane implementation)
- [x] P008F002T002 Migrate `src/elements/ElementPanel.ts` from `<ul>/<li>` to Tweakpane `Pane` wrapper + `FolderApi` buttons; each button stores `data-element-id` attribute; `buildElementItem` creates Tweakpane button per element
- [x] P008F003T001 Write `src/elements/ElementPanel.remove.test.ts`: `#elements-remove-btn` exists in panel; clicking without selection does nothing; clicking after selection removes element from list and scene (RED — remove button not yet in P008F002T002 implementation)
- [x] P008F003T002 Add panel-level Remove button (`#elements-remove-btn`) to `src/elements/ElementPanel.ts`; wire to `removeElement`, `renderer.sync`, `controls.clear`

**Exit Criteria** (all pass): `pnpm test` → 121 tests; `pnpm lint` → zero warnings.

---

## Phase 9 (P009): Inline × Remove Button + + at Bottom (US-N1)

**Goal**: Replace the panel-level Remove button with an inline × button on each element
row — hidden (`hidden = true`) until the row is selected. Relocate the `+` button and
picker to appear **below** the scene list (after `elementsFolder` in DOM order).

**Story goal**: As a user, I can remove an element using a × button that appears inline
on the selected row; the + button is at the bottom of the list, not the top.

**Independent test criteria**: No `#elements-remove-btn` in the panel; each element
row has a `[data-remove-for]` button; that button is `hidden` when the row is not
selected, `hidden = false` when the row is selected; clicking it removes the element and
clears controls; `+` button appears after all element rows in DOM order.

- [x] P009F001T001 Update `src/elements/ElementPanel.remove.test.ts`: remove `#elements-remove-btn` assertions; add — no `#elements-remove-btn` in panel; each element row contains `[data-remove-for]` button; that button `hidden === true` by default; after selecting a row its `[data-remove-for]` button has `hidden === false`; clicking `[data-remove-for]` on selected row removes element from store and scene (RED — implementation still has panel-level button)
- [x] P009F001T002 Update `src/elements/ElementPanel.ts`: move `elementsFolder` + `renderList(...)` call **before** `addBtn`/`pickerFolder` creation; remove panel-level `removeBtn` block; inside `buildElementItem` append a raw `<button data-remove-for="...">×</button>` with `hidden = true` after `btn.element`; on `onSelect` set the active row's `[data-remove-for]` button `hidden = false` and all others `hidden = true`; on remove callback call `removeElement`, `save`, `renderer.sync`, `controls.clear`, reset `selectedId = undefined`
- [x] P009F001T003 Add CSS in `src/style.css` for `[data-remove-for]` button styling (compact, right-aligned, visual appearance — no test needed)

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

ESLint: `ElementPanel.ts` ≤ 150 non-comment lines. If exceeded, extract `buildElementItem` into `src/elements/ElementPanelList.ts` and add that file to the `no-raw-html: 'off'` exception in `eslint.config.mjs`.

---

## Phase 10 (P010): Label Editing in Control Pane (US-N2)

**Goal**: `ElementControls.bind()` prepends a **Name** text input (before all parametric
attributes) bound to `element.label`. Editing it fires `onChange` with an updated element.

**Story goal**: As a user, I can rename any element by editing the Name field in the
control pane; the row label in the element list updates immediately.

**Independent test criteria**: After `bind()`, the folder has `parametric + fixed + 1`
children (Name is the first); changing the Name input fires `onChange` with `{ ...element, label: newValue }`.

- [x] P010F001T001 Add test to `src/elements/ElementControls.test.ts`: after `bind(createBox(), cb)` the folder has `5` children (1 Name + 3 parametric + 1 fixed); simulating a change on the first binding fires `onChange` with updated `label` (RED — `bind()` does not currently add a Name binding)
- [x] P010F001T002 In `src/elements/ElementControls.ts` add at the START of `bind()`: `const labelProxy = { label: element.label }; const labelBinding = folder.addBinding(labelProxy, 'label', { label: 'Name' }); labelBinding.on('change', ev => { current = { ...current, label: ev.value }; onChange(current); });` where `current` tracks the mutable element throughout all binding callbacks

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% |

---

## Phase 11 (P011): Material Color Attribute + `createPlane` (US-N3 + US-N6)

**Goal**: Add `material.color` (type `'color'`, default `"#888888"`) as a parametric
attribute to every primitive factory. Add `createPlane()` for a flat plane element.

**Story goal**: As a user, I can change an element's color in the control pane; I can
also add a Plane primitive to the scene.

**Independent test criteria**: `createBox()` has 4 parametric attributes (width, height,
depth, color); `createSphere()` has 2; `createCylinder()` has 3; `createPlane()` returns
a valid `SceneElement` with `geometry.type = 'plane'`, `geometry.width`, `geometry.height`,
and `material.color`.

- [x] P011F001T001 Update inline doctests in `src/elements/PrimitiveFactory.ts` for `createBox`, `createSphere`, `createCylinder`: change `parametric_attributes.length` assertions to `4`, `2`, `3` respectively; add assertion that a `material.color` attribute with `attribute_value === '#888888'` exists (RED — attribute not yet added)
- [x] P011F001T002 Add `material.color` parametric attribute (type `'color'`, value `"#888888"`) to `createBox`, `createSphere`, `createCylinder` in `src/elements/PrimitiveFactory.ts`; attribute appears last in `parametric_attributes` array
- [x] P011F002T001 Write inline doctest for `createPlane()` in `src/elements/PrimitiveFactory.ts`: `el.fixed_attributes.find(a => a.attribute_uri_key === 'geometry.type')?.attribute_value === 'plane'`; `el.parametric_attributes.length === 3` (width, height, color); `el.origin_attributes.length === 3` (RED — function does not exist)
- [x] P011F002T002 Implement `createPlane(label?: string): SceneElement` in `src/elements/PrimitiveFactory.ts` (width `"2"`, height `"2"`, color `"#888888"`, type `"plane"`, position.x/y/z = 0); export from `src/elements/index.ts`

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings |
| Tests + Doctests | `pnpm test` | All pass (updated doctests pass) |
| Coverage | `pnpm test:coverage` | ≥98% |

---

## Phase 12 (P012): `SelectionHighlight` — BackSide Outline (US-N4)

**Goal**: New pure module `createSelectionHighlight()` attaches a double-mesh BackSide
outline child to a `THREE.Mesh` on selection and removes it on deselect.

**Story goal**: As a user, I can visually identify the selected element via a blue-ish
outline in the 3D viewport.

**Independent test criteria**: `attach(mesh)` adds a child named `'__selection-outline__'`
with `material.side === THREE.BackSide`; scale > 1; calling `attach` twice is idempotent;
`detach(mesh)` removes the child; `detach` on a mesh without the child is a no-op;
`clear(sceneManager, id)` removes the outline from the mesh at the given id.

- [x] P012F001T001 Write `src/elements/SelectionHighlight.test.ts`: create a real `SceneManager` with `MockSceneRenderer`; test all five cases above (RED — file and function do not exist)
- [x] P012F001T002 Implement `createSelectionHighlight()` in `src/elements/SelectionHighlight.ts`; `attach(mesh)`: guard against double-attach by checking `mesh.getObjectByName('__selection-outline__')`; clone geometry, create `new THREE.MeshStandardMaterial({ color: 0x00aaff, side: THREE.BackSide })`; set `scale.setScalar(1.015)`, `name = '__selection-outline__'`, add as child; `detach(mesh)`: find by name, `mesh.remove(child)`; `clear(sm, id)`: call `detach(sm.getObject(id) as THREE.Mesh)` if object found; export `SelectionHighlightApi` type and factory from `src/elements/index.ts`

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% |

---

## Phase 13 (P013): `TransformGizmo` — Move / Rotate / Scale (US-N5)

**Goal**: New module `createTransformGizmo(camera, domElement, orbitControls, _tcFactory?)`
wraps `THREE.TransformControls`. The optional `_tcFactory` parameter (defaults to
`(c, d) => new TransformControls(c, d)`) is a testability seam: tests inject a
`FakeTransformControls` extending `THREE.EventDispatcher` to avoid WebGL coupling.

**Story goal**: As a user, I can translate, rotate, or scale the selected element using
a 3D gizmo; camera orbit is automatically disabled while dragging.

**Independent test criteria**: `getHelper()` is a `THREE.Object3D`; `orbitControls.enabled`
is `false` while fake dispatches `dragging-changed` with `value: true`, and `true` after;
`onObjectChange(cb)` callback fires when fake dispatches `objectChange`; `onDragEnd(cb)`
fires when `dragging-changed` fires with `value: false`; `dispose()` does not throw.

- [x] P013F001T001 Write `src/scene/TransformGizmo.test.ts`: define `FakeTransformControls` extending `THREE.EventDispatcher` with stub methods (`attach`, `detach`, `setMode`, `dispose`) and override `getHelper` to return `this` as `THREE.Object3D`; inject via `_tcFactory`; test all five criteria above (RED — file and function do not exist)
- [x] P013F001T002 Implement `createTransformGizmo` in `src/scene/TransformGizmo.ts`; on `dragging-changed` event: `orbitControls.enabled = !ev.value`; when `ev.value === false` also fire all `onDragEnd` callbacks; on `objectChange` fire all `onObjectChange` callbacks; `getHelper()` returns `tc` (TransformControls is an Object3D); export `TransformGizmoApi` and `TransformMode` types

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% |

---

## Phase 14 (P014): `ElementRenderer` — Color + Plane + `setSelected` API

**Goal**: `ElementRenderer` reads `material.color` from `parametric_attributes` and
applies it to `MeshStandardMaterial`. Adds `'plane'` geometry case (`PlaneGeometry` +
`DoubleSide`). Adds `setSelected(id | undefined)` to `ElementRendererApi` delegating
to an internally owned `SelectionHighlight` instance.

**Independent test criteria**: `sync` with a box having `material.color = '#ff0000'`
→ mesh material color equals `#ff0000`; `sync` with a plane element → `THREE.Mesh`
created; `setSelected(id)` adds `__selection-outline__` child; `setSelected(undefined)`
removes it.

- [x] P014F001T001 Add tests to `src/elements/ElementRenderer.test.ts`: box with `material.color = '#ff0000'` — after `sync`, `(mesh.material as THREE.MeshStandardMaterial).color.getHexString() === 'ff0000'`; plane element (via `createPlane()`) — after `sync`, mesh is `instanceof THREE.Mesh` (RED — renderer does not read color or handle plane)
- [x] P014F001T002 Update `src/elements/ElementRenderer.ts`: add `'plane'` case in geometry builder using `new THREE.PlaneGeometry(w, h)`; for plane materials use `side: THREE.DoubleSide`; read `material.color` from `parametric_attributes` via `Array.find`; pass color string to `new THREE.MeshStandardMaterial({ color: colorValue })`
- [x] P014F002T001 Add tests to `src/elements/ElementRenderer.test.ts` for `setSelected(id)` and `setSelected(undefined)`: after sync with box, `renderer.setSelected(box.id)` → `sceneManager.getObject(box.id)` has a child named `'__selection-outline__'`; `renderer.setSelected(undefined)` → child removed (RED — `ElementRendererApi` has no `setSelected`)
- [x] P014F002T002 Add `setSelected(id: string | undefined): void` to `ElementRendererApi` interface in `src/elements/ElementTypes.ts` (or `ElementRenderer.ts`); implement using `createSelectionHighlight()` instance stored in closure; update `src/elements/index.ts` re-exports if needed

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% |

Note: Tweakpane color picker in jsdom may emit a non-fatal `<canvas>` warning — expected, not a failure.

---

## Phase 15 (P015): `Viewport` — Expose `getTransformGizmo()`

**Goal**: `Viewport.ts` creates a `TransformGizmo`, adds its helper to the scene, and
exposes `getTransformGizmo(): TransformGizmoApi` on `ViewportApi`.

**Independent test criteria**: `viewport.getTransformGizmo()` returns an object with
`attach`, `detach`, `setMode`, `getHelper`, `onObjectChange`, `onDragEnd`, `dispose`.

- [x] P015F001T001 Add test to `src/viewport/Viewport.test.ts`: `createViewport(...)` returns object with `getTransformGizmo()` method; calling it returns a non-null object that has all 7 `TransformGizmoApi` methods (RED — `ViewportApi` does not include `getTransformGizmo`)
- [x] P015F001T002 Update `src/viewport/Viewport.ts`: import `createTransformGizmo` from `'../scene/TransformGizmo.js'`; create `const gizmo = createTransformGizmo(camera, canvas, controls)` after `controls` is set up; call `sceneManager.addObject('__transform-gizmo__', gizmo.getHelper())`; add `getTransformGizmo(): TransformGizmoApi` to `ViewportApi` interface and return object

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% |

---

## Phase 16 (P016): `ElementPanel` — Gizmo Wiring + Plane Picker

**Goal**: `createElementPanel` accepts an optional 4th param `transformGizmo?: TransformGizmoApi`.
On select: call `renderer.setSelected(id)` and `transformGizmo?.attach(mesh)`.
On remove: call `renderer.setSelected(undefined)` and `transformGizmo?.detach()`.
Register `onObjectChange` → update `origin_attributes` in store + `save` (no `renderer.sync` during drag).
Register `onDragEnd` → call `renderer.sync(state)`. Add `'Plane'` to the picker.

**Independent test criteria**: Selecting an element calls `renderer.setSelected(id)`;
removing calls `renderer.setSelected(undefined)`; a `TransformGizmoApi` stub's `attach`
is called on select and `detach` on remove; `onObjectChange` updates origin_attributes
in the store without re-building the mesh; `onDragEnd` triggers `renderer.sync`; the
picker contains a `'Plane'` button that creates a plane element.

- [x] P016F001T001 Write `src/elements/ElementPanel.gizmo.test.ts`: create a `TransformGizmoApi` stub (plain object implementing the interface — records calls); pass as 4th arg to `createElementPanel`; assert `stub.attach` called on row select; `stub.detach` called on remove; `onObjectChange` callback given to stub fires a position update stored in `load().elements[0].origin_attributes`; `onDragEnd` callback triggers a `renderer.sync` call (RED — 4th param not yet accepted)
- [x] P016F001T002 Update `src/elements/ElementPanel.ts`: add optional `transformGizmo?: TransformGizmoApi` as 4th param; in `onSelect`: call `renderer.setSelected(selectedId)` and `transformGizmo?.attach(sceneManager.getObject(selectedId))`; in remove callback: call `renderer.setSelected(undefined)` and `transformGizmo?.detach()`; on mount register `transformGizmo?.onObjectChange((obj) => { /* update origin_attributes from obj.position, save(state), no sync */ })` and `transformGizmo?.onDragEnd(() => renderer.sync(state))`
- [x] P016F002T001 Add test to `src/elements/ElementPanel.test.ts`: picker buttons include `'Plane'`; clicking Plane creates a plane element in the scene (RED — 'Plane' not in picker)
- [x] P016F002T002 Add `'Plane'` button to the picker types array in `src/elements/ElementPanel.ts`; import `createPlane` from `'./PrimitiveFactory.js'`; map `'Plane'` → `createPlane()`

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

ESLint: `ElementPanel.ts` ≤ 150 non-comment lines.

---

## Phase 17 (P017): `SystemSettings` + `SystemPanel` — Dark / Light Theme (US-N7)

**Goal**: Pure `SystemSettings` module (localStorage + `matchMedia` seam). Tweakpane
`SystemPanel` fixed to the bottom-left corner — Theme dropdown and Follow-system checkbox.

**Story goal**: As a user, I can switch the app between dark and light themes; the setting
persists across reloads; enabling "Follow system" automatically matches OS preference.

**Independent test criteria**:
- `loadSettings()` returns `{ theme: 'dark', followSystem: false }` as fallback
- `saveSettings` + `loadSettings` round-trips data unchanged
- `applyTheme` sets `document.documentElement.dataset['theme']` to the correct value
- `detectSystemTheme(mq)` returns `'dark'` / `'light'` based on injected `mq` stub
- `createSystemPanel(settings)` returns object with `dispose()`; changing Theme fires `onThemeChange`

- [x] P017F001T001 Write `src/system/SystemSettings.test.ts`: test `loadSettings()` with no localStorage key → fallback; `saveSettings` + `loadSettings` round-trip; `applyTheme({ theme: 'light', followSystem: false })` → `document.documentElement.dataset['theme'] === 'light'`; `detectSystemTheme((q) => ({ matches: true }))` → `'dark'`; `detectSystemTheme((q) => ({ matches: false }))` → `'light'` (RED — file does not exist)
- [x] P017F001T002 Implement `src/system/SystemSettings.ts`: `loadSettings(storage?: Storage)`, `saveSettings(data, storage?)`, `applyTheme(data)` (sets `document.documentElement.dataset['theme']`), `detectSystemTheme(mq?: (q: string) => { matches: boolean })` (defaults to `window.matchMedia`); export `ThemeValue` type and `SystemSettingsData` interface
- [x] P017F002T001 Write `src/system/SystemPanel.test.ts`: `createSystemPanel({ theme: 'dark', followSystem: false })` returns `{ dispose }`; `dispose()` does not throw; simulate binding change → `onThemeChange` callback called (RED — file does not exist)
- [x] P017F002T002 Implement `src/system/SystemPanel.ts`: create Tweakpane `Pane` with `style.position = 'fixed'; style.bottom = '1rem'; style.left = '1rem'`; bind `theme` (list: `{ Dark: 'dark', Light: 'light' }`) and `followSystem` (checkbox); on any change: `saveSettings(data)`, `applyTheme(data)`, optional `onThemeChange(data.theme)`; when `followSystem` toggled true: call `detectSystemTheme()` and register `matchMedia('prefers-color-scheme: dark').addEventListener('change', ...)` listener; when toggled false: remove listener; export `SystemPanelApi` type and `createSystemPanel` factory

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% |

Both new files ≤ 150 non-comment lines.

---

## Phase 18 (P018): CSS Theme Variables + `main.ts` Final Integration

**Goal**: Add CSS custom properties for dark (default) and light themes. Call
`applyTheme(loadSettings())` as the **first statement** in `main()` to prevent flash.
Pass `viewport.getTransformGizmo()` to `createElementPanel`. Mount `createSystemPanel`
with a background-update callback.

> `main.ts` is excluded from coverage; no TDD cycle — wiring and verification only.

- [x] P018F001T001 Add CSS custom properties to `src/style.css`: `:root` dark defaults (`--bg: #1a1a2e; --fg: #e8e8e8; --panel-bg: #16213e; --panel-border: #0f3460; --accent: #00aaff;`); `[data-theme="light"]` overrides (`--bg: #f4f4f4; --fg: #1a1a1a; --panel-bg: #ffffff; --panel-border: #cccccc; --accent: #0066cc;`); apply variables to `body`, `#elements-panel`, and any other affected selectors
- [x] P018F001T002 Update `src/main.ts`: `import { applyTheme, loadSettings } from './system/SystemSettings.js'`; make `applyTheme(loadSettings())` the **first statement** of `main()` (before DOM setup); `import { createSystemPanel } from './system/SystemPanel.js'`; call `createSystemPanel(settings, (theme) => sceneManager.setBackground(theme === 'light' ? '#e8e8ec' : '#1a1a2e'))` after viewport setup
- [x] P018F002T001 Update `src/main.ts`: pass `viewport.getTransformGizmo()` as the 4th argument to `createElementPanel`; run `pnpm typecheck` + `pnpm lint` to confirm zero errors
- [x] P018F002T002 Smoke-test `pnpm dev`: dark theme loads by default; System panel is visible in bottom-left; switching to Light changes viewport background; adding Box/Sphere/Cylinder/Plane creates meshes in scene; selecting mesh shows gizmo + outline; inline × removes element; run `pnpm build` to confirm zero errors

**Exit Criteria**:

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Build | `pnpm build` | Zero errors |
| Coverage | `pnpm test:coverage` | ≥98% (`main.ts` excluded via `/* v8 ignore */`) |

---

## Dependency Graph

### Phase Ordering

```
P001 → P002 → P003 → P004 → P005 → P006 → P007   ← DONE (P001–P007)
                                              │
                                              └── P008                 ← DONE
                                                    │
                           ┌──────────────────────── P009 (inline ×)
                           │    ┌────────────────── P010 (label edit)  [parallel with P009]
                           │    │    ┌────────────── P011 (color+plane) [parallel]
                           │    │    │    ┌────────── P012 (highlight)  [parallel]
                           │    │    │    │    ┌───── P013 (gizmo)      [parallel]
                           │    │    │    │    │
                           │    │    └────┴──► P014 (renderer update — needs P011+P012)
                           │    │             │
                           │    │    ┌───────►│    P015 (viewport — needs P013)
                           │    │    │         │         │
                           └────┴────┴─────────┴─────────┴──► P016 (panel wiring — needs P009+P010+P014+P015)
                                                                         │
                           P017 (system settings — independent) ─────────┤
                                                                         ▼
                                                                       P018 (final integration)
```

### User Story Completion Map

| Phase | User Story | Produces | Blocks |
|-------|-----------|----------|--------|
| P009 | US-N1: Inline × remove + + at bottom | Updated `ElementPanel.ts` | P016 |
| P010 | US-N2: Rename elements | Updated `ElementControls.ts` | P016 |
| P011 | US-N3+N6: Color attribute + Plane | Updated `PrimitiveFactory.ts` | P014 |
| P012 | US-N4: Selection highlight | `SelectionHighlight.ts` (new) | P014 |
| P013 | US-N5: Transform gizmo | `TransformGizmo.ts` (new) | P015 |
| P014 | Bridge: renderer update | Updated `ElementRenderer.ts` | P016 |
| P015 | Bridge: viewport API | Updated `Viewport.ts` | P016 |
| P016 | Integration: panel wiring | Updated `ElementPanel.ts` | P018 |
| P017 | US-N7: Theme toggle | `SystemSettings.ts` + `SystemPanel.ts` (new) | P018 |
| P018 | Final: CSS + `main.ts` | Updated `style.css` + `main.ts` | — |

### Parallel Execution Opportunities

**Batch A** (after P008, independent):
- P009 (`ElementPanel.ts`) and P010 (`ElementControls.ts`) and P011 (`PrimitiveFactory.ts`) and P012 (`SelectionHighlight.ts` — new) and P013 (`TransformGizmo.ts` — new) and P017 (`SystemSettings.ts` / `SystemPanel.ts` — new)

**Batch B** (after P011 + P012 complete):
- P014 (`ElementRenderer.ts`) — depends on P011 + P012

**Sequential constraint**: P015 waits for P013; P016 waits for P009 + P010 + P014 + P015; P018 waits for P016 + P017.

---

## Implementation Strategy

**MVP (deliver immediately)**: P009 + P010 + P011
- Pure improvements to existing files; zero new module dependencies
- Fixes inline remove UX, adds label editing, adds color attribute + plane primitive

**Next batch**: P012 + P013
- Two new isolated modules (SelectionHighlight, TransformGizmo)
- Fully unit-testable without changing the panel

**Integration batch**: P014 + P015 + P016
- Wire highlight + gizmo into the renderer, viewport, and panel

**Final batch**: P017 + P018
- Theme system independent of elements; main.ts final wiring

---

## Composability Pass Results

Gaps found and resolved before writing this task list:

| Gap | Resolution |
|-----|-----------|
| `ElementRendererApi` lacked `setSelected()` | P014F002 adds it; P016 runs after P014 |
| `ViewportApi` lacked `getTransformGizmo()` | P015 adds it; P016 runs after P015 |
| `createElementPanel` signature needed 4th param | P016F001 adds it as `optional` — existing tests unaffected |
| `Plane` picker depends on `createPlane` | P016F002 runs after P011; correct ordering confirmed |
| CSS `[data-theme="light"]` needs to precede `applyTheme` call | P018F001T001 adds CSS before P018F001T002 wires `applyTheme`; no flash because attribute is set before first paint |
| `SceneManager.setBackground()` needed by `main.ts` | Already exists — no task needed |
| `remove.test.ts` tests `#elements-remove-btn` which P009 removes | P009F001T001 explicitly updates those tests (RED → GREEN cycle in P009) |
| `[P]` marker on P009F001T002 + P010F001T002 (same-phase concern) | Neither marked `[P]` — both have single-phase sequential concern within their own phase |

| 4-step store-mutation coordination | Inline sequence (`newState = mutate(...)` → `save` → `renderer.sync` → `renderList`) described identically in P005F003T002 and P006F002T002 — same file, same 4 steps | **Introduced `commit(newState)` private closure helper** in P005F003T002; P006F002T002 calls `commit(updateElement(...))`. Eliminates ~10 duplicated lines in `ElementPanel.ts`, maintaining comfortable headroom under the 150-line limit across both phases. |

---

## Phase 19 (P019): Bug Fix — Elements Panel CSS: Remove Solid Sidebar

**Goal**: The `#elements-panel` div currently renders as a full-height opaque sidebar (dark `background`, `border-right`, `bottom: 0`, `width: 220px`). This blocks the 3D viewport on the left side, reducing usable viewport space. The fix removes all sidebar-styling properties so only the Tweakpane pane itself is visible, floating over the canvas. As a side-effect the `#elements-panel` no longer has a hard-coded width, so the Tweakpane pane inside uses its natural width — matching the `SystemPanel` Tweakpane width in the bottom-left corner and resolving the visual width mismatch between the two panels.

**Independent test criteria**: No logic changes — visual CSS fix only. Verify with `pnpm typecheck`, `pnpm lint`, and `pnpm format:check`.

### P019F001 — Remove opaque sidebar styles from `#elements-panel`

- [x] P019F001T001 In `src/style.css`, update the `#elements-panel` rule: remove `background: var(--panel-bg)`, `border-right: 1px solid var(--panel-border)`, `bottom: 0`, and `width: 220px`; keep `position: absolute`, `left: 0`, `top: 0`, `z-index: 10`, `pointer-events: none`, and the `#elements-panel > *` pointer-events rule unchanged — the Tweakpane pane will float over the canvas with its own compact background

### Exit Criteria: Phase 19

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass — no coverage regression |

Additional ESLint-enforced constraints:
- No source logic changed; `max-lines` and JSDoc rules unaffected

---

## Phase 20 (P020): Bug Fix — Color Attribute Value Not Applied to Mesh

**Goal**: `ElementControls.bindOpts('color')` returns `{ view: 'color' }`. In Tweakpane v4, when `{ view: 'color' }` is explicitly specified on a CSS-hex-string binding, `ev.value` from the `onChange` callback is an internal `IntColor` object rather than a plain hex string. `String(ev.value)` then returns `"[object Object]"`, which Three.js cannot parse — the mesh color stays at the default. The project research (R8) explicitly states: _"CSS hex string auto-detected by Tweakpane v4; no `{ view: 'color' }` needed"_. Removing the explicit `{ view: 'color' }` from `bindOpts` lets auto-detection run, guaranteeing `ev.value` is a plain `#rrggbb` string that both the store and Three.js accept.

**Independent test criteria**: After the fix, changing a color attribute binding's input fires `onChange` with an element whose matching `attribute_value` starts with `'#'` and has length 7 (standard hex).

### P020F001 — Remove forced `{ view: 'color' }` from `bindOpts`

- [ ] P020F001T001 In `src/elements/ElementControls.test.ts`, add a new `it` block: bind an element whose `parametric_attributes` includes `{ attribute_uri_key: 'material.color', attribute_type: 'color', attribute_value: '#888888' }`; obtain the Tweakpane folder; find the color input via `folder.element.querySelector('input')`; mutate its value to `'#ff0000'` and dispatch a `change` event (`bubbles: true`); assert that the `onChange` spy was called and the updated element's `attribute_value` for `material.color` starts with `'#'` — this test MUST FAIL before T002 (currently `String(ev.value)` returns `"[object Object]"` when `{ view: 'color' }` is active)
- [ ] P020F001T002 In `src/elements/ElementControls.ts`, update `bindOpts`: remove the `if (type === 'color') return { view: 'color' };` branch — the function should return `{ step: 0.01 }` for `'number'` and `{}` for all other attribute types; Tweakpane v4 auto-detects `#rrggbb` strings and returns a hex string from `onChange`

### Exit Criteria: Phase 20

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

Additional ESLint-enforced constraints:
- All new test code in `ElementControls.test.ts` ≤ 150 non-comment lines total
- No `@ts-ignore` / `@ts-expect-error` without adjacent `@example` doctest

---

## Phase 21 (P021): Bug Fix — TransformGizmo Loses Attachment After renderer.sync

**Goal**: `renderer.sync(state)` replaces every scene mesh (`sceneManager.addObject` removes the old `Object3D` and adds a fresh one). After `commit()` or `onDragEnd` call `renderer.sync`, the `TransformGizmo` is still attached to the **old** (removed) mesh. Because the old mesh no longer has world-space visibility, TransformControls' raycasting against gizmo handles always misses — the user's next pointer-down is captured by `OrbitControls` instead, rotating the viewport. The selection outline is also lost. Fix: after every `renderer.sync(state)` call in both `commit` and the `onDragEnd` handler, re-attach the gizmo and re-apply the selection highlight when `selectedId !== undefined`.

**Independent test criteria**: After a `commit(updateElement(...))` or an `onDragEnd` event, `stub.attach` is called a second time (once on initial select, once after sync), and `renderer.setSelected` is called again.

### P021F001 — Re-attach gizmo + selection after `commit`

- [ ] P021F001T001 In `src/elements/ElementPanel.gizmo.test.ts`, add a new `it` block: select an element (triggering the first `stub.attach`); then invoke the `onChange` callback that `controls.bind` registered (simulate a dimension change to trigger `commit(updateElement(...))`); assert that `stub.attach` has now been called **twice** and that `stub.attachCallCount === 2` — this test MUST FAIL before T002 (current `commit` does not re-attach the gizmo)
- [ ] P021F001T002 In `src/elements/ElementPanel.ts`, update the `commit(newState: ElementStoreData)` closure: after `renderer.sync(state)`, add a guard block — `if (selectedId !== undefined) { const mesh = sceneManager.getObject(selectedId); if (mesh !== undefined) { gizmo.attach(mesh); renderer.setSelected(selectedId); } }` where `gizmo` is a non-optional reference extracted at the top of the outer function (use `if (transformGizmo !== undefined) { const gizmo = transformGizmo; ... }` to avoid repeated optional-chain usage inside closures and satisfy TypeScript strict null-checks)

### P021F002 — Re-attach gizmo + selection after `onDragEnd`

- [ ] P021F002T001 In `src/elements/ElementPanel.gizmo.test.ts`, add a new `it` block: select an element; record the initial `stub.attachCallCount`; fire the `onDragEnd` trigger exposed by the `TransformGizmoStub`; assert that `stub.attachCallCount` has incremented by 1 and `renderer.setSelected` was called — this test MUST FAIL before T002 (current `onDragEnd` handler calls only `renderer.sync`)
- [ ] P021F002T002 In `src/elements/ElementPanel.ts`, update the `transformGizmo?.onDragEnd(...)` handler (or equivalently, the `if (transformGizmo !== undefined)` block from P021F001T002): after `renderer.sync(state)`, add the same re-attach guard — `if (selectedId !== undefined) { const mesh = sceneManager.getObject(selectedId); if (mesh !== undefined) { gizmo.attach(mesh); renderer.setSelected(selectedId); } }`

### Exit Criteria: Phase 21

| Gate | Command | Required |
|------|---------|----------|
| TypeScript | `pnpm typecheck` | Zero errors |
| Lint | `pnpm lint` | Zero warnings (`--max-warnings 0`) |
| Format | `pnpm format:check` | All files pass |
| Tests + Doctests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥98% lines / functions / branches / statements |

Additional ESLint-enforced constraints:
- `ElementPanel.ts` must stay ≤ 150 non-comment lines after the fix (verify with `pnpm lint`)
- No `@ts-ignore` / `@ts-expect-error` without adjacent `@example` doctest
- No unused locals or parameters in added guard blocks

---

## Bug-Fix Dependency Graph (P019–P021)

| Phase | Bug fixed | Key artifact | Blocks |
|-------|-----------|-------------|--------|
| P019 | Panel renders as opaque sidebar | `src/style.css` | — |
| P020 | Color `ev.value` is `[object Object]` | `src/elements/ElementControls.ts` | — |
| P021 | Gizmo loses mesh after `renderer.sync` | `src/elements/ElementPanel.ts` | — |

P019, P020, and P021 are fully independent — they touch different files and can be executed in any order or in parallel.

### Composability Pass (P019–P021)

| Gap type | Check | Result |
|----------|-------|--------|
| CSS variable not read | P019 removes properties — no new CSS variables introduced | No gap |
| DOM element never created | No new DOM elements | No gap |
| Method tested too late | P021 tests `stub.attach` count; `TransformGizmoStub.attach` already exists in `ElementPanel.gizmo.test.ts` | No gap |
| Return value not tested | `sceneManager.getObject(selectedId)` already tested in `SceneManager.test.ts` | No gap |
| CSS visual collapse | P019 removes the opaque background; Tweakpane pane retains its own panel background | No gap |
| `[P]` marker | No tasks marked `[P]` — each F-group pair (T001→T002) is sequential within its own phase | No gap |
