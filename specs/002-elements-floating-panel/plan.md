# Implementation Plan: Elements Floating Panel

**Branch**: `002-elements-floating-panel` | **Date**: 2026-04-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-elements-floating-panel/spec.md`

## Summary

Add a left-side floating **Elements** panel to the Frameer 3D shell. A `+` button lets
users add primitive shapes (box, sphere, cylinder). All scene element data is persisted
in `localStorage` via a centralized `ElementStore` — a pure-data, immutable-update module
with no Three.js or DOM imports. Rendering and controls are driven entirely from the
store. Element attributes are ULID-identified and typed for direct Tweakpane binding when
an element is selected. The recursive `SceneElement` schema supports arbitrary nesting
through `child_elements`.

## Technical Context

**Language/Version**: TypeScript 5.5 (strict mode — all flags in `tsconfig.app.json`)
**Primary Dependencies**: `three`, `tweakpane`, `@tweakpane/plugin-essentials`, `ulid` (new — MIT, ~2.5 KB, zero deps), Vite 6, Vitest 4 + vite-plugin-doctest, pnpm 10
**Storage**: `localStorage` key `frameer3d.v1.elements` (JSON `ElementStoreData`); existing `frameer3d.v1.layout` unchanged
**Testing**: Vitest + jsdom; 98%+ coverage required; pure-function store logic is fully testable; DOM panel tested via jsdom; `ElementRenderer` tested via `SceneManager` interface seam
**Target Platform**: Browser (Chrome/Firefox/Safari latest); WebGL 2; no backend
**Project Type**: Single-page web application (local-first, no backend)
**Performance Goals**: Panel list renders without layout thrash; `absolute` positioning removes panel from normal flow; renderer sync is O(n) over element count
**Constraints**: Max 150 non-comment source lines per file; one public concern per file; all JSDoc must be `@example` doctests only; no mocks of internal dependencies
**New Dependency**: `ulid` — add to `dependencies` in `package.json`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Based on AGENTS.md coding standards:

| Gate | Status | Notes |
|------|--------|-------|
| Max 150 non-comment lines per file | PASS — 7 files in `src/elements/`; each < 130 lines per data-model.md module map | |
| One public concern per file | PASS — types, store, panel, factory, renderer, controls, index each have one purpose | |
| TypeScript strict mode | PASS — `ulid` ships native TS types; recursive `SceneElement` compiles under strict + exactOptionalPropertyTypes | |
| JSDoc @example-only doctests | PASS — all public store functions and factory functions will carry `@example @import.meta.vitest` blocks | |
| Coverage ≥ 98% | PASS — `ElementStore` is pure functions (100% testable); `ElementRenderer` uses SceneManager seam; `ElementPanel` DOM tested in jsdom | |
| No mocks of internal dependencies | PASS — `ElementRenderer` injected with `SceneManager` (public interface); `ElementControls` injected with `FolderApi` (public interface) | |
| No backend dependencies | PASS — localStorage only; `ulid` uses `crypto.getRandomValues` (no fetch) | |

**Post-Phase-1 re-check**: All gates pass. The 7-file `elements/` domain splits cleanly.
`ElementStore` has zero external deps (pure TS). `ElementRenderer` and `ElementControls`
each have exactly one external boundary (Three.js / Tweakpane respectively).

## Project Structure

### Documentation (this feature)

```text
specs/002-elements-floating-panel/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (ULID, CSS overlay, Tweakpane, localStorage)
├── data-model.md        # Phase 1 output (types, primitives, module map)
├── contracts/
│   └── elements-api.md  # Phase 1 output (TypeScript API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── elements/              ← NEW domain
│   ├── ElementTypes.ts    ← all shared types (AttributeType, SceneElement, etc.)
│   ├── ElementStore.ts    ← localStorage load/save + pure immutable-update functions
│   ├── PrimitiveFactory.ts← createBox / createSphere / createCylinder (uses ulid)
│   ├── ElementRenderer.ts ← maps ElementStoreData → SceneManager.addObject calls
│   ├── ElementControls.ts ← maps SceneElement → Tweakpane FolderApi bindings
│   ├── ElementPanel.ts    ← floating panel DOM overlay + coordinator
│   └── index.ts           ← public re-exports
├── controls/
│   └── ControlPane.ts     ← unchanged; addFolder used by main.ts for "Element" folder
├── scene/
│   └── SceneManager.ts    ← unchanged; injected into ElementRenderer
└── main.ts                ← add createElementPanel(...) call
```

**Structure Decision**: Single-project; new `src/elements/` domain alongside existing
`controls/`, `scene/`, `layout/`, `viewport/`, `utils/`, `occt/` domains.

## Complexity Tracking

No constitution violations in this feature.

---

## Phase 0: Research (complete — see research.md)

| Unknown | Resolution |
|---------|------------|
| ULID library | `ulid` npm (MIT, ~2.5 KB, zero deps, native TS types) |
| Recursive TypeScript type | Native `interface SceneElement { child_elements: SceneElement[] }` — no gotchas |
| CSS floating panel | `position: absolute` inside `position: relative` container; `pointer-events: none` passthrough |
| Tweakpane v4 clear + rebuild | `folder.children.forEach(b => b.dispose())` then rebuild; must dispose-and-rebuild on selection change |
| localStorage capacity | 5 MiB per origin; safe for thousands of elements |

---

## Phase 1: Design (complete — see data-model.md and contracts/elements-api.md)

### Data Model Summary

```
ElementStoreData                    ← localStorage root { elements: SceneElement[] }
  └── SceneElement                  ← recursive; ULID id; label; description
        ├── parametric_attributes[] ← ParametricAttribute { id, uri_key, value, type }
        ├── fixed_attributes[]      ← FixedAttribute { id, uri_key, value }
        ├── origin_attributes[]     ← OriginAttribute { id, dim_key, dim_value: number }
        └── child_elements[]        ← SceneElement (recursive)
```

### Interface Contracts Summary

| Module | Key Exports |
|--------|-------------|
| `ElementTypes.ts` | `AttributeType`, `ParametricAttribute`, `FixedAttribute`, `OriginAttribute`, `SceneElement`, `ElementStoreData` |
| `ElementStore.ts` | `load()`, `save()`, `addElement()`, `removeElement()`, `updateElement()`, `findElement()` |
| `PrimitiveFactory.ts` | `createBox()`, `createSphere()`, `createCylinder()` |
| `ElementRenderer.ts` | `createElementRenderer(sceneManager): ElementRendererApi` → `{ sync(data) }` |
| `ElementControls.ts` | `createElementControls(folder): ElementControlsApi` → `{ bind(el, onChange), clear() }` |
| `ElementPanel.ts` | `createElementPanel(container, sceneManager, folder): ElementPanelApi` |
| `index.ts` | Re-exports all public symbols |

### `main.ts` Integration Point

```ts
const elementFolder = controlPane.addFolder('Element');
const viewportContainer = canvas.parentElement as HTMLElement;
createElementPanel(viewportContainer, sceneManager, elementFolder);
```

### CSS Integration Point

```css
/* In style.css: */
#viewport-container { position: relative; }

#elements-panel {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 220px;
  z-index: 10;
  pointer-events: none;
}

#elements-panel > * { pointer-events: auto; }
```

---

## Phase 2: Tasks (generated by `/speckit.tasks`)

*Not yet generated. Run `/speckit.tasks` to produce `tasks.md`.*
