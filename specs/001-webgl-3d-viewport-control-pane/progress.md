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

