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
