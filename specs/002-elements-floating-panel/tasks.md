# Tasks: Elements Floating Panel

**Input**: Design documents from `specs/002-elements-floating-panel/`
**Feature Branch**: `002-elements-floating-panel`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/elements-api.md ✓

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

- [ ] P005F001T001 Write `src/elements/ElementPanel.test.ts`: declare a `MockSceneRenderer` (implements `SceneRenderer`; same pattern as `SceneManager.test.ts`) and create a real `SceneManager(new MockSceneRenderer(), new THREE.PerspectiveCamera())`; create a real Tweakpane `FolderApi` via `new Pane({container: document.createElement('div')}).addFolder({title:'Element'})`; clear `localStorage` via `localStorage.clear()` inside each `it` block (not in `beforeEach`); test `createElementPanel(div, sm, folder)` returns an object with `getElement()` and `dispose()`; `getElement()` returns an `HTMLElement` with `id === 'elements-panel'`; that element is a descendant of `div`; `dispose()` removes the panel element from `div`
- [ ] P005F001T002 Implement `createElementPanel(container: HTMLElement, sceneManager: SceneManager, controlFolder: FolderApi): ElementPanelApi` in `src/elements/ElementPanel.ts`; create a `<div id="elements-panel">` and append to `container`; import and call `createElementRenderer(sceneManager)` — store as `renderer`; load initial state via `load()` and call `renderer.sync(state)`; create an empty `<ul id="elements-list">` inside the panel div; return `{ getElement(): panel, dispose(): void }` — `dispose` removes the panel div from container; **do not import `ElementControls` yet** (controls wiring is added in P006)

### P005F002 — Element list rendering

- [ ] P005F002T001 Add tests to `src/elements/ElementPanel.test.ts` for list rendering: pre-seed `localStorage` with `{elements:[boxEl, sphereEl]}` (two pre-built elements) before calling `createElementPanel`; verify `getElement().querySelectorAll('li').length === 2`; verify each `<li>` has `data-id` attribute matching the element's id; verify `<li>` text content includes the element's `label`; test with a nested element (`child_elements` non-empty): child `<li>` present with `data-depth="1"` attribute
- [ ] P005F002T002 Implement element list rendering in `src/elements/ElementPanel.ts`: add a `renderList(state, listEl)` helper that clears `listEl.innerHTML` and appends one `<li data-id="..." data-depth="0">label</li>` per top-level element; recursively append child elements with incremented depth; call `renderList` once after panel creation with the initial state; update the `state` reference and call `renderList` after each store mutation (add/update)

### P005F003 — "+" button and primitive picker

- [ ] P005F003T001 Add tests to `src/elements/ElementPanel.test.ts` for "+" button and picker: after `createElementPanel`, query `#elements-add-btn` — verify it exists inside `#elements-panel`; simulate click on `#elements-add-btn` → query `#elements-picker` — verify it is visible and contains 3 buttons with text `'Box'`, `'Sphere'`, `'Cylinder'`; simulate click on `'Box'` → `#elements-picker` is hidden; `#elements-list` now has 1 row; `localStorage.getItem('frameer3d.v1.elements')` parses to data with `elements.length === 1`; `sceneManager.getObject(newId)` is `instanceof THREE.Mesh` where `newId` is the id from the stored element; repeat for `'Sphere'` and `'Cylinder'` (separate `it` blocks)
- [ ] P005F003T002 Implement "+" button and picker in `src/elements/ElementPanel.ts`: append `<button id="elements-add-btn">+</button>` to the panel div; append `<div id="elements-picker" hidden>` containing three `<button>` elements labelled `Box`, `Sphere`, `Cylinder`; **define a private `commit(newState: ElementStoreData): void` closure helper** inside `createElementPanel` that does: `state = newState; save(state); renderer.sync(state); renderList(state, listEl);` — this helper centralises the 4-step coordination so every mutation calls `commit(...)` rather than repeating the steps inline; on "+" click toggle `hidden` attribute on picker; on each type-button click: call `createBox()` / `createSphere()` / `createCylinder()`, then call `commit(addElement(state, el))` and hide picker; import `createBox`, `createSphere`, `createCylinder` from `./PrimitiveFactory.js` and `addElement`, `save` from `./ElementStore.js`

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

- [ ] P006F001T001 Write `src/elements/ElementControls.test.ts`: create a real Tweakpane `Pane` in a jsdom `div` and call `pane.addFolder({title:'Element'})` to get a real `FolderApi`; test `createElementControls(folder)` returns `{bind, clear}`; test `clear()` on an empty folder is a no-op (no throw); test `bind(createBox(), onChange)` adds `4` children to folder (3 parametric + 1 fixed: box has 3 parametric_attributes + 1 fixed_attribute); test `clear()` after bind → `folder.children.length === 0`; test that simulating a Tweakpane binding change (set proxy value, trigger `pane.refresh()`) causes `onChange` to be called with an updated `SceneElement` containing the new `attribute_value`; test `bind` clears existing children before adding new ones (call bind twice, folder still has only 4 children)
- [ ] P006F001T002 Implement `createElementControls(folder: FolderApi): ElementControlsApi` in `src/elements/ElementControls.ts`; `clear()` disposes all children: `[...folder.children].forEach(b => b.dispose())`; `bind(element, onChange)` calls `clear()` first, then for each `parametric_attribute` builds a mutable proxy object `{ [attr.attribute_uri_key]: coercedValue }` where `coercedValue` is `Number(v)` for `'number'`, `v === 'true'` for `'boolean'`, `v` for `'string'`, `v` for `'color'`, and parses JSON array for `'select'`; calls `folder.addBinding(proxy, attr.attribute_uri_key, bindingOptions(attr.attribute_type))` with `{ step: 0.01 }` for `'number'`, `{ view: 'color' }` for `'color'`, `{}` otherwise; on binding change event reconstructs updated `SceneElement` with the new `attribute_value` serialised back to string and calls `onChange(updatedElement)`; for each `fixed_attribute` calls `folder.addBinding({[attr.attribute_uri_key]: attr.attribute_value}, attr.attribute_uri_key, { readonly: true })` as a read-only monitor

### P006F002 — Wire selection in `ElementPanel`

- [ ] P006F002T001 Add tests to `src/elements/ElementPanel.test.ts` for selection: after creating panel with one pre-seeded box element, simulate click on the `<li>` row; verify the row receives `aria-selected="true"`; verify `folder.children.length > 0` (controls bound); simulate click on a different row (with two pre-seeded elements) → first row loses `aria-selected`, second gains it, folder rebound to second element; simulate control binding `onChange` callback (call the callback directly captured from the controls mock / real binding interaction) → `sceneManager.getObject(id)` returns an updated mesh after `renderer.sync`
- [ ] P006F002T002 Extend `src/elements/ElementPanel.ts` to add selection: import `createElementControls` from `./ElementControls.js`; call `createElementControls(controlFolder)` inside `createElementPanel` — store as `controls`; in `renderList`, attach a `click` event listener on each `<li>`: on click, remove `aria-selected` from all rows, set `aria-selected="true"` on clicked row, find the element by `data-id` in `state` via `findElement(state, id)`, call `controls.bind(foundElement, (updated) => commit(updateElement(state, updated)))` — reusing the `commit()` helper defined in P005F003T002; update `dispose()` to call `controls.clear()`; import `findElement`, `updateElement` from `./ElementStore.js`

### P006F003 — `index.ts` definitive re-exports (all at once)

- [ ] P006F003T001 [P] Write the complete `src/elements/index.ts` in a single pass — **all** public symbols from all 6 modules at once (no prior partial writes needed; no test file imports from this file so it is safe to defer until here): `export type { AttributeType, ParametricAttribute, FixedAttribute, OriginAttribute, SceneElement, ElementStoreData }` from `./ElementTypes.js`; `export { load, save, addElement, removeElement, updateElement, findElement }` from `./ElementStore.js`; `export { createBox, createSphere, createCylinder }` from `./PrimitiveFactory.js`; `export { createElementRenderer }` and `export type { ElementRendererApi }` from `./ElementRenderer.js`; `export { createElementControls }` and `export type { ElementControlsApi }` from `./ElementControls.js`; `export { createElementPanel }` and `export type { ElementPanelApi }` from `./ElementPanel.js`; run `pnpm typecheck` to confirm all re-exported symbols resolve correctly

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

- [ ] P007F001T001 Update `src/main.ts`: capture the return value of `createControlPane(controlsContainer, layoutState)` into `const controlPane`; add `const elementFolder = controlPane.addFolder('Element')` to get the `FolderApi` for element attribute bindings; add `const viewportContainer = canvas.parentElement` with an `instanceof HTMLElement` guard (throw if not); call `createElementPanel(viewportContainer, sceneManager, elementFolder)` imported as a named export from `'./elements/index.js'`; run `pnpm typecheck` and `pnpm lint` to verify zero errors; smoke-test in browser via `pnpm dev` to confirm `#elements-panel` appears on the left edge of the 3D viewport, "+" button creates primitives visible in the scene, and selecting an element opens controls in the Tweakpane pane

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

## Dependency Graph

### User Story Completion Order

```
P001 (Setup)
  └─► P002 (ElementTypes)
        └─► P003 (ElementStore + PrimitiveFactory)   ← US1 MVP
              └─► P004 (ElementRenderer)              ← US2
                    └─► P005 (ElementPanel DOM)       ← US3
                          └─► P006 (ElementControls + Selection)  ← US4
                                └─► P007 (Integration)
```

Each phase is a hard prerequisite for the next. No user story begins until P002 is complete.

### Cross-Phase Dependency Map

| Artifact Produced | In Task | Consumed By | Risk if Missing |
|---|---|---|---|
| `position: relative` on `#viewport-container` in `src/style.css` | P001F002T001 | P005F001T002 (`#elements-panel` overlay positioning) | Panel renders outside viewport bounds |
| `#elements-panel` CSS rule in `src/style.css` | P001F002T001 | P005F001T002 (panel styled correctly) | Panel invisible or unstyled |
| `ElementTypes.ts` type declarations | P002F001T001 | All P003+ files | Compile errors in all downstream modules |
| `load()` + `save()` with optional `storage` param | P003F001T002 | P003F002T001 (error-branch test), P005F001T002 (initial load) | Can't cover QuotaExceededError branch |
| `addElement()`, `removeElement()`, `updateElement()`, `findElement()` | P003F002T002 | P005F002T002, P005F003T002, P006F002T002 | Panel add/update flow broken |
| `createBox()`, `createSphere()`, `createCylinder()` | P003F003T002 | P005F003T002 (picker creates elements) | "+" button cannot create primitives |
| `createElementRenderer()` | P004F001T002 | P005F001T002 (panel creates renderer internally) | Panel cannot sync Three.js scene |
| `commit(newState)` private helper | P005F003T002 | P006F002T002 (onChange reuses same 4-step coordination) | 4-step sequence duplicated; `ElementPanel.ts` approaches 150-line limit |
| `createElementControls()` | P006F001T002 | P006F002T002 (panel wires controls binding) | Selection does not bind to Tweakpane |
| `createElementPanel()` full implementation | P006F002T002 | P007F001T001 (wired in main.ts) | Feature not accessible in running app |
| `index.ts` complete re-exports | P006F003T001 | P007F001T001 (`main.ts` imports `createElementPanel` from domain index) | Integration import fails at compile time |

### Parallel Execution Opportunities

| Phase | Parallel Tasks | Condition |
|---|---|---|
| P001 | F001T001 ∥ F002T001 ∥ F003T001 | All touch different files; no shared deps |
| P003 | F003T001 ∥ F001T001 | PrimitiveFactory and ElementStore are different files; both only require P002 |
| P003 | F003T002 ∥ F002T002 | Same as above — different files, no shared dependency |

---

## Implementation Strategy

**MVP Scope** (P001–P003): After P003, `ElementStore` and `PrimitiveFactory` are fully tested with 98%+ coverage. The remaining phases build on this stable foundation.

**Incremental Delivery Order**:
1. **P003 alone** — pure data layer; `pnpm test` passes cleanly with no DOM/WebGL requirements
2. **P003 + P004** — elements can be driven programmatically into the Three.js scene
3. **P003 + P004 + P005** — full panel UI; users add elements via "+" button
4. **P003–P006** — complete feature with attribute editing in Tweakpane
5. **P007** — plugged into the live application

**Suggested commit point**: After each Phase's Exit Criteria pass (one commit per phase, tagged by phase ID).

---

## Composability Pass — Gaps Found and Resolved

| Gap Type | Description | Resolution |
|---|---|---|
| CSS rule not wired | `#viewport-container` lacked `position: relative` — absolute-positioned panel overlay would fall outside viewport container | Added explicit instruction to P001F002T001 to modify the existing `#viewport-container` rule in `src/style.css` |
| Method tested too late | `ElementPanel.ts` creates `ElementRenderer` internally — if ElementControls was also imported in P005, it would fail (unimplemented) | P005F001T002 explicitly states "do not import `ElementControls` yet"; controls import deferred to P006F002T002 |
| Return value not captured | `main.ts` currently discards `createControlPane()` return value — `addFolder()` cannot be called | P007F001T001 explicitly updates `main.ts` to capture the return value |
| Error branch untestable | `save()` `QuotaExceededError` branch unreachable without mocking `window.localStorage` (jsdom has no quota) | P003F001T001/T002 specify adding optional `storage: Storage = localStorage` parameter so tests inject a fake Storage that throws |
| `noUncheckedIndexedAccess` trap | Fixed-attribute access pattern `arr[0].attribute_value` would return `T \| undefined` — likely runtime errors | P003F002T002 and P004F001T002 both specify using `Array.find()` and `for...of` instead of numeric index access |

## DRY Pass — Repeated Patterns Consolidated

| Pattern | Where It Appeared | Resolution |
|---|---|---|
| `index.ts` incremental re-exports | P003F004T001 and P004F002T001 opened the same file across phases for partial export lists | **Removed** both incremental tasks; P006F003T001 writes all 6 modules' re-exports in one pass. Safe because no test file imports from `index.ts` — tests import directly from their module file. `main.ts` (the only `index.ts` consumer) is wired in P007, after P006F003T001 completes. |
| 4-step store-mutation coordination | Inline sequence (`newState = mutate(...)` → `save` → `renderer.sync` → `renderList`) described identically in P005F003T002 and P006F002T002 — same file, same 4 steps | **Introduced `commit(newState)` private closure helper** in P005F003T002; P006F002T002 calls `commit(updateElement(...))`. Eliminates ~10 duplicated lines in `ElementPanel.ts`, maintaining comfortable headroom under the 150-line limit across both phases. |
