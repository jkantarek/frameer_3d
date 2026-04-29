# Research: WebGL 3D Viewport + Control Pane Shell

**Phase**: 0 — Pre-Design Research  
**Branch**: `001-webgl-3d-viewport-control-pane`  
**Date**: 2026-04-28  
**Revision**: Updated — Three.js + OpenCASCADE.js (WASM)

All NEEDS CLARIFICATION items from the Technical Context have been resolved here.

---

## R-1: 3D Renderer — Three.js

**Decision**: Use `three` (npm) via `THREE.WebGLRenderer` instead of raw WebGL 2.

**Rationale**: Three.js provides a production-hardened WebGL abstraction with camera
classes, orbit controls, geometry helpers, and a scene graph — everything this feature
requires. Implementing equivalent infrastructure from scratch would be a multi-week
undertaking and is not the value-add of this application. The licence is MIT. Bundle
size with tree-shaking (Vite + ES modules) is ~170 KB gzipped — acceptable.

**Key setup**:
```typescript
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
```

**Alternatives considered**: Raw WebGL 2 — ruled out; recreating scene graph, orbit
controls, and BufferGeometry handling is not justified. Babylon.js — heavier, more
opinionated, harder to tree-shake.

---

## R-2: Parametric Geometry — OpenCASCADE.js (WASM)

**Decision**: Use `opencascade.js` (npm) — the official Emscripten-compiled WASM port
of OpenCASCADE Technology (OCCT).

**Rationale**: OCCT is the industry-standard open-source CAD kernel (used by FreeCAD,
Salome, etc.). It provides Boolean operations, fillets, chamfers, BRep topology, and
STEP/IGES I/O that would take years to reimplement. The JS binding targets modern
browsers. This shell feature only establishes the WASM loading infrastructure; OCCT
geometry calls are deferred to future workflow element features.

**WASM loading**: The `.wasm` binary (~25 MB) requires these three headers on all responses
that serve it (and on the page that loads it):
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: cross-origin`

**Deployment (Dokploy + Cloudflare)**: Set headers at the **origin container level**
(Caddy or Nginx config in the Dokploy service). This is version-controlled, has no
Cloudflare plan constraints, and Cloudflare forwards origin headers transparently.
The ~25 MB WASM binary is a static Vite build artifact in `dist/`; Cloudflare
automatically edge-caches it from the origin on first request.

**Caddy example** (simplest, single file):
```
:3000 {
    root * /app/dist
    file_server
    header {
        Cross-Origin-Opener-Policy "same-origin"
        Cross-Origin-Embedder-Policy "require-corp"
        Cross-Origin-Resource-Policy "cross-origin"
    }
}
```

Do **not** load the WASM from a third-party CDN (e.g. jsDelivr) where you cannot
control the `CORP` response header.

**Initialisation pattern**:
```typescript
import initOpenCascade from 'opencascade.js';
import type { OpenCascadeInstance } from 'opencascade.js';

let occt: OpenCascadeInstance | null = null;

export async function loadOcct(): Promise<OpenCascadeInstance> {
  if (occt) return occt;
  occt = await initOpenCascade();
  return occt;
}
```

**OCCT → Three.js bridge**: OCCT shapes will be tessellated to triangles via
`BRepMesh_IncrementalMesh`, then vertices/normals extracted into `THREE.BufferGeometry`.
This bridge is implemented in future features; this shell only bootstraps the WASM.

**Alternatives considered**: `@opencascade/wasm-occ` (subset) — less complete,
missing BRep operations needed later. Rolling a custom geometry kernel — years of work.

---

## R-3: OrbitControls

**Decision**: Use `three/addons/controls/OrbitControls.js` (bundled with Three.js,
no separate install).

**Rationale**: `OrbitControls` provides mouse drag + scroll zoom + touch support out
of the box. It attaches directly to `THREE.PerspectiveCamera` and the renderer's DOM
element.

**Alternatives considered**: Custom orbit math — rejected; Three.js already includes it.

---

## R-4: Renderer Resize Handling

**Decision**: `ResizeObserver` on the canvas wrapper element. On resize:
```typescript
renderer.setSize(width, height, false); // false = don't override CSS size
camera.aspect = width / height;
camera.updateProjectionMatrix();
```

The `false` argument prevents Three.js from overriding CSS dimensions set by flexbox.

**Alternatives considered**: `window.onresize` — misses pane-resize reflows.

---

## R-5: CSS Layout Strategy

**Decision**: Full-viewport `display: flex; height: 100dvh; overflow: hidden` on
`body`. Canvas wrapper `flex: 2`, pane `flex: 1; min-width: 200px; max-width: 50vw`.
Drag handle mutates a CSS custom property `--pane-width` via `style.setProperty`.

**Rationale**: Single-pass CSS reflow per drag event. `dvh` avoids iOS Safari address-
bar offset.

**Alternatives considered**: CSS Grid — equivalent complexity; flexbox is idiomatic
for 1D splits.

---

## R-6: localStorage Persistence

**Decision**: Key `frameer3d.v1.layout`. Schema: `{ paneWidth: number; paneCollapsed: boolean }`.
Reads/writes wrapped in `try/catch`. Validates `typeof` and range on read; returns
defaults on any failure.

**Alternatives considered**: `sessionStorage` — does not survive reload. `IndexedDB`
— overkill for two scalar values.

---

## R-7: Testing Strategy (Three.js + WASM in Vitest/jsdom)

**Decision**: Dependency-injection at the `THREE.WebGLRenderer` boundary. `SceneManager`
accepts a `SceneRenderer` interface (not the concrete `THREE.WebGLRenderer`). Tests
supply a `MockSceneRenderer`. Three.js pure math and scene graph classes (`THREE.Vector3`,
`THREE.Scene`, `THREE.Object3D`, etc.) do not touch GL and work in jsdom directly.

WASM (`OccKernel`) is isolated behind a `GeometryKernel` interface. The WASM module
is not loaded in unit tests — only the loading infrastructure and interface are tested.

**Rationale**: jsdom does not implement WebGL. `THREE.WebGLRenderer` throws immediately
in jsdom. The seam must be at the renderer boundary. Pure Three.js math/scene-graph
objects work fine in jsdom and can be used in assertions.

**Alternatives considered**: Vitest browser mode (real browser) — slower, flaky in CI.
`jest-three` — unmaintained.

---

## R-8: TypeScript Types

**Decision**:
- Three.js types: bundled directly in the `three` npm package (no `@types/three` needed
  for modern versions; verify on install).
- OpenCASCADE.js types: bundled `.d.ts` in the `opencascade.js` npm package.

**Alternatives considered**: None — both packages are the canonical type sources.

---

## R-9: Control Pane UI — Tweakpane + plugin-essentials

**Decision**: Use `tweakpane` (npm) for the control pane UI. Register
`@tweakpane/plugin-essentials` at startup.

**Rationale**: Tweakpane is a lightweight (~30 KB gzipped), MIT-licensed,
TypeScript-first GUI library designed exactly for this use case: live parameter
controls for 3D/creative tools. It is framework-agnostic (no React/Vue required),
mounts to any DOM container, and provides a clean `addFolder` / `addBinding`
API that workflow elements can use to inject their own controls into the shared
pane without coupling to each other.

`@tweakpane/plugin-essentials` adds high-value building blocks for the parametric
part families being ported (frames, rings, mesh lattices, n-gons):
- **Interval input** — min/max range sliders (e.g. bevel range, wall thickness)
- **Radio grid** — enum selectors (e.g. `FrameHolePattern`, `RingShape`)
- **Button grid** — action grids (e.g. quick-apply presets)
- **FPS graph** — frame rate monitor (debug/perf overlay)

**Setup pattern**:
```typescript
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

const pane = new Pane({ container: document.getElementById('scene-controls')! });
pane.registerPlugin(EssentialsPlugin);
```

**Workflow element integration pattern**: each workflow element receives the `Pane`
instance and adds its own folder:
```typescript
const folder = pane.addFolder({ title: 'Frame Part' });
folder.addBinding(spec, 'outerWidth', { min: 10, max: 500 });
folder.addBinding(spec, 'holePattern', {
  view: 'radiogrid', groupName: 'pattern', size: [3, 1],
  cells: (x: number) => ({ title: ['Corners', 'Midpoints', 'Custom'][x]!, value: x }),
});
```

**Testing**: Tweakpane `Pane` instantiation requires a DOM container. Tests supply a
real `div` (jsdom supports it) and verify folder/binding registration through the
public `children` API. No mock of Tweakpane internals needed.

**Alternatives considered**: dat.GUI — unmaintained, no TypeScript types. lil-gui
(dat.GUI fork) — fewer input types, no `plugin-essentials` ecosystem. Custom HTML
controls — significant ongoing maintenance for every new part parameter.

---

## R-10: Long-Term Workflow Elements (Domain Context)

The `blender-mcp-tooling` Python codebase at
`/home/jkantarek/3D Printing/tooling` defines the full set of parametric part
families that will become Tweakpane workflow elements in Frameer 3D:

| Part family | Key parameters (from Python domain) |
|-------------|-------------------------------------|
| `FramePart` | outer/inner dims, border widths, bevels, chamfers, corner radii, hole pattern |
| `RingPart` | shape (rectangular/oval/diamond/custom), inner/outer dims, chamfer, bevel |
| `MeshCellLattice` | octagon outer size, chamfer, diamond dims, bar width, row/col pitch |
| `NGon` | sides, per-vertex radii, bilateral symmetry |
| `NineElemCluster` | 9-slot composable cluster of octagon + lozenge + diamond |
| `RepeatGrid` | rows × cols, x/y spacing, source collection |
| `BooleanCut` | target solid, cutter collection |
| `KeeperBar` | width, length, hole spacing |
| `TieConnector` | width, length, thickness |
| `VentFrame` | mesh frame envelope dimensions |

Each will be implemented as a `src/workflows/<name>/` domain module in a future
feature, using OCCT for geometry and Tweakpane for parameter UI. This shell feature
establishes the shared infrastructure they all depend on.

---

## Summary of Resolved Unknowns

| NEEDS CLARIFICATION | Resolution |
|---------------------|-----------|
| 3D renderer choice | Three.js (`three` npm) — production-hardened, MIT, tree-shakeable |
| Parametric geometry | OpenCASCADE.js WASM (`opencascade.js` npm) — OCCT port |
| Orbit camera | `THREE.OrbitControls` (bundled with Three.js) |
| DPR / resize handling | `ResizeObserver` + `renderer.setSize(w, h, false)` + `camera.updateProjectionMatrix()` |
| CSS layout pattern | Flexbox + CSS custom property drag handle |
| localStorage safety | Versioned key + `try/catch` + type validation |
| Testing Three.js in jsdom | `SceneRenderer` interface seam + `MockSceneRenderer` |
| TypeScript types | Bundled in `three` and `opencascade.js` packages |
| Control pane UI | Tweakpane + `@tweakpane/plugin-essentials` |
| Long-term workflow domain | 10 part families from `blender-mcp-tooling` (see R-10) |
