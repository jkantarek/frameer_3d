# Ralph Progress Log

Feature: 001-webgl-3d-viewport-control-pane
Started: 2026-04-28 08:06:34

## Codebase Patterns

- `src/utils/math.ts` uses `@example \`\`\`ts @import.meta.vitest` doctests (no prose JSDoc)
- CSS custom properties used for dynamic layout values (`--pane-width`)
- `data-collapsed` attribute drives collapsed state styling via CSS attribute selector
- `vitest.config.ts` uses `includeSource` for inline doctests; `jsdom` environment

---
## Iteration 1 - 2026-04-28T13:06:38Z
**User Story**: Phase 1 (P001) — Setup
**Tasks Completed**: 
- [x] P001F001T001: Install three, opencascade.js, tweakpane, @tweakpane/plugin-essentials, @types/three
- [x] P001F002T001: Add Cross-Origin-Resource-Policy header + optimizeDeps exclude for opencascade.js in vite.config.ts
- [x] P001F003T001: Replace canvas#app in index.html with full DOM (viewport-container, drag-handle, scene-controls with toggle button)
- [x] P001F003T002: Create src/style.css with flex layout + import in src/main.ts
**Tasks Remaining in Story**: None - story complete
**Commit**: 8d9e845
**Files Changed**: 
- vite.config.ts
- index.html
- src/style.css
- src/main.ts
- package.json / pnpm-lock.yaml
- specs/001-webgl-3d-viewport-control-pane/tasks.md
**Learnings**:
- `pnpm format` auto-fixed pre-existing formatting issues in `.vscode/settings.json`, `eslint.config.mjs`, `pnpm-lock.yaml` before committing
- Phase 1 exit criteria has no test gate (only typecheck, lint, format:check)
- `opencascade.js` must be excluded from `optimizeDeps` to prevent Vite pre-bundling the WASM artifact
---

---
## Iteration 2 - 2026-04-28T13:15:00Z
**User Story**: Phase 2 (P002) — Foundational Prerequisites
**Tasks Completed**: 
- [x] P002F001T001: Create src/scene/SceneRenderer.ts with SceneRenderer interface + structural doctest
- [x] P002F002T001: Write black-box unit tests for LayoutState (11 tests covering all branches)
- [x] P002F002T002: Implement LayoutState interface + loadLayoutState / saveLayoutState / defaultLayoutState
**Tasks Remaining in Story**: None - story complete
**Commit**: 1dd5747
**Files Changed**: 
- src/scene/SceneRenderer.ts
- src/layout/LayoutState.ts
- src/layout/LayoutState.test.ts
- specs/001-webgl-3d-viewport-control-pane/tasks.md
**Learnings**:
- TypeScript interface files (no runtime code) show as 0% in v8 coverage but don't reduce the aggregate — overall coverage stays 100%
- ESLint blocks `() => {}` empty arrow functions and `!` non-null assertions in tests — use `vi.spyOn(console, 'warn')` without mockImplementation; use `raw ?? ''` instead of `raw!`
- `@typescript-eslint/no-confusing-void-expression` requires braces in `expect(() => { saveLayoutState(...); }).not.toThrow()` — no shorthand arrow returning void
- Rubber duck caught missing branch coverage for valid-JSON-non-object cases (null, number) and missing/non-number paneWidth — added tests for both
---

## Iteration 3 - 2026-04-28T09:08:00Z
**User Story**: Phase 3 (P003) — US1: WebGL Viewport + Scene
**Tasks Completed**: 
- [x] P003F001T001–P003F008T001: All Phase 3 tasks (SceneManager, Viewport, ControlPane, main.ts bootstrap)
**Tasks Remaining in Story**: None - Phase 3 complete
**Commit**: 5c74161
**Files Changed**: 
- src/scene/SceneManager.ts, src/scene/SceneManager.test.ts (created)
- src/scene/SceneRenderer.ts (setSize signature updated)
- src/viewport/Viewport.ts, Viewport.test.ts, ViewportResize.test.ts (created)
- src/controls/ControlPane.ts, ControlPane.test.ts (created)
- src/main.ts (updated), src/main.test.ts (deleted), package.json (@tweakpane/core added)
**Learnings**:
- `import * as EssentialsPlugin from '@tweakpane/plugin-essentials'` — no named `EssentialsPlugin` export; use namespace import to satisfy `TpPluginBundle`
- `@tweakpane/core` must be installed explicitly to resolve tweakpane type re-exports
- `/* v8 ignore start/stop */` correctly excludes the `THREE.WebGLRenderer` IIFE from v8 coverage
- `@typescript-eslint/no-this-alias` fires on `fakeVar = this`; use static class property instead
- TypeScript allows implementing interface methods with fewer parameters (structural subtyping) — avoids unused-param lint errors in mocks
- `Array<T>` is forbidden; use `T[]` instead
---
## Iteration 4 - 2026-04-28T09:31:00Z
**User Story**: Phase 4 (P004) — US2: Layout Persistence + Collapse/Resize
**Tasks Completed**: 
- [x] P004F001T001–P004F004T001: All Phase 4 tasks (DragHandle drag+toggle+ARIA+main.ts wiring)
**Tasks Remaining in Story**: None - Phase 4 complete
**Commit**: ce6d098
**Files Changed**: 
- src/layout/DragHandle.ts (created): createDragHandle + createToggleButton
- src/layout/DragHandle.drag.test.ts (created): F001 core drag tests (6 tests)
- src/layout/DragHandle.drag2.test.ts (created): F001 edge cases + F003 ARIA drag (5 tests)
- src/layout/DragHandle.toggle.test.ts (created): F002 toggle + F003 ARIA toggle (9 tests)
- src/main.ts (updated): loadLayoutState wiring, --pane-width init, drag/toggle wiring
- specs/.../tasks.md: P004 tasks marked complete
**Learnings**:
- jsdom 26 has no `PointerEvent` or `setPointerCapture`; stub with `vi.stubGlobal('PointerEvent', FakePointerEvent)` where `FakePointerEvent extends MouseEvent` with `readonly pointerId: number`
- `handleEl.setPointerCapture = (): void => { return; }` on the instance (not prototype) avoids `no-empty-function` lint error
- `@typescript-eslint/restrict-template-expressions` forbids numbers in template literals; use `String(n) + 'px'` instead of `` `${n}px` ``
- Prettier expands multi-arg constructor calls past 80 chars; use a `fire(el, type, init)` helper to keep dispatch calls compact and test files under the 150-line limit
- `max-lines: { skipComments: true, skipBlankLines: false }` — blank lines count; split test files along describe-block boundaries when approaching the limit
---
---
## Iteration 6 - 2026-04-28T10:02:00Z
**User Story**: Phase 6 (P006) — Polish & Cross-Cutting Concerns
**Tasks Completed**: 
- [x] P006F001T001: Linting audit — all files pass `pnpm lint --max-warnings 0`; no file approaches 150-line limit
- [x] P006F001T002: Full quality gate suite — typecheck, lint, format, test (68 tests), coverage (100%) all pass
- [x] P006F002T001: `pnpm build` succeeds zero-error; `dist/assets/opencascade.wasm-DEAxFiks.wasm` (65MB) present in dist/
- [x] P006F002T002: Dev server starts (`pnpm dev`) and serves correct HTML; `role="img"` and `id="viewport"` present; automated tests cover drag/toggle/layout-state behavior
**Tasks Remaining in Story**: None - story complete
**Commit**: cb0badb
**Files Changed**: 
- src/occt/opencascade-wrapper.ts (created): Vite-aware WASM loader using `?url` import
- src/occt/OccKernel.ts: updated import to use local wrapper
- src/occt/OccKernel.test.ts: updated vi.mock to mock wrapper path
- src/occt/opencascade.d.ts: added subpath type declaration for wasm.js glue
- src/vite-env.d.ts (created): `/// <reference types="vite/client" />` for `?url` types
- vite.config.ts: removed failed vite-plugin-wasm; added wrapper to optimizeDeps.exclude
- vitest.config.ts: excluded opencascade-wrapper.ts from coverage (Vite build adapter)
- package.json / pnpm-lock.yaml: added vite-plugin-wasm + vite-plugin-top-level-await (dev deps; plugins not used in config but installed for reference)
- specs/.../tasks.md: P006 tasks marked complete
**Learnings**:
- `vite-plugin-wasm` is the wrong fix for `opencascade.js`: the plugin transforms WASM as ESM modules, but opencascade.js expects `locateFile` to return a URL string, not a WebAssembly.Module
- Correct fix: local wrapper `opencascade-wrapper.ts` importing `opencascade.js/dist/opencascade.wasm.wasm?url` — Vite's `?url` query suffix returns the asset URL string, which is exactly what Emscripten's `locateFile` needs
- Add subpath module declarations to `opencascade.d.ts` for TypeScript to type the glue factory function
- Add `src/vite-env.d.ts` with `/// <reference types="vite/client" />` to enable `*.wasm?url` as `string` type
- Exclude Vite build adapters (like opencascade-wrapper.ts) from coverage just as `src/main.ts` is excluded
- `vi.mock('./opencascade-wrapper.js', ...)` works correctly when test and wrapper are co-located in the same directory
---

**User Story**: Phase 5 (P005) — US3: OpenCASCADE.js WASM Loading
**Tasks Completed**: 
- [x] P005F001T001: Write tests for loadOcct + isOcctLoaded (4 tests)
- [x] P005F001T002: Implement OccKernel with GeometryKernel interface + promise-caching for concurrent safety
- [x] P005F002T001: Wire loadOcct() fire-and-forget in main.ts
**Tasks Remaining in Story**: None - story complete
**Commit**: f989ce0
**Files Changed**: 
- src/occt/opencascade.d.ts (created): module declaration for opencascade.js (no bundled types)
- src/occt/OccKernel.ts (created): GeometryKernel interface + loadOcct + isOcctLoaded
- src/occt/OccKernel.test.ts (created): 4 tests via vi.resetModules() + dynamic imports
- src/main.ts (updated): added loadOcct() fire-and-forget
**Learnings**:
- opencascade.js has no TypeScript declarations; create src/occt/opencascade.d.ts with `declare module 'opencascade.js'`
- opencascade.js exports `initOpenCascade` as a NAMED export (not default); task spec's `default` mock was incorrect
- Use `vi.resetModules()` in `beforeEach` + dynamic imports in each `it` to test module-level singletons without `beforeEach` state hiding
- Cache the in-flight Promise (not just the resolved value) to prevent race condition when `loadOcct()` is called concurrently before first resolves
- `void loadOcct().catch(err => ...)` is the correct no-floating-promises pattern for fire-and-forget in main.ts
- `OpenCascadeInstance = unknown` (not `object`) is the correct opaque type for intentionally inaccessible WASM instance
---
