# Data Model: WebGL 3D Viewport + Control Pane Shell

**Phase**: 1 — Design  
**Branch**: `001-webgl-3d-viewport-control-pane`  
**Date**: 2026-04-28  
**Revision**: Updated — Three.js + OpenCASCADE.js (WASM)

---

## Domain Entities

### 1. `LayoutState`

Persisted in `localStorage` under key `frameer3d.v1.layout`.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| `paneWidth` | `number` | `window.innerWidth / 3` | `200 ≤ paneWidth ≤ window.innerWidth * 0.5` |
| `paneCollapsed` | `boolean` | `false` | — |

**Validation on read**: if `paneWidth` is not a number or out of range → reset to default. If JSON parse fails → reset to defaults. If `paneCollapsed` is not boolean → treat as `false`.

**State transitions**:
```
paneCollapsed=false ──[toggle]──► paneCollapsed=true
paneCollapsed=true  ──[toggle]──► paneCollapsed=false
paneWidth=N         ──[drag]───► paneWidth=clamp(N+Δ, 200, window.innerWidth*0.5)
```

---

### 2. Three.js Scene Entities (runtime, not persisted)

These are standard Three.js objects; no custom classes are needed for the shell.

| Object | Type | Purpose |
|--------|------|---------|
| `scene` | `THREE.Scene` | Root scene graph node; background colour `#1a1a2e` |
| `camera` | `THREE.PerspectiveCamera` | 60° FoV, near 0.01, far 1000 |
| `renderer` | `THREE.WebGLRenderer` | `antialias: true`, `powerPreference: 'high-performance'` |
| `controls` | `OrbitControls` | Attached to camera + renderer.domElement |
| `axesHelper` | `THREE.AxesHelper` | Default scene content (XYZ RGB lines) |

**OrbitControls state** (in-memory, not persisted in v1):
- `target`: `THREE.Vector3` (default `[0, 0, 0]`)
- Camera position determined by controls; defaults to `[0, 2, 5]`

---

### 3. `SceneManager` (aggregate root)

| Field | Type | Behaviour |
|-------|------|-----------|
| `objects` | `Map<string, THREE.Object3D>` | Ordered insertion; added to/removed from `THREE.Scene` |
| `scene` | `THREE.Scene` | Owned by SceneManager |
| `camera` | `THREE.PerspectiveCamera` | Owned by SceneManager |
| `renderer` | `SceneRenderer` | Injected interface (allows MockSceneRenderer in tests) |

**Operations**:
```
addObject(id, obj)    → added to Three.js scene + stored in map; duplicate replaces
removeObject(id)      → removed from scene + deleted from map; no-op if not found
getCamera()           → returns THREE.PerspectiveCamera
getObject(id)         → returns THREE.Object3D or undefined
renderFrame()         → called by RAF loop; renderer.render(scene, camera)
```

---

### 4. `SceneRenderer` (interface — GL boundary for testability)

```typescript
interface SceneRenderer {
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;
  setSize(width: number, height: number): void;
}
```

`THREE.WebGLRenderer` satisfies this interface. Tests use `MockSceneRenderer`.

---

### 5. `OccKernel` (async singleton — WASM boundary)

| Field | Type | Behaviour |
|-------|------|-----------|
| `instance` | `OpenCascadeInstance \| null` | null until `loadOcct()` resolves |

**Operations**:
```
loadOcct() → Promise<OpenCascadeInstance>   (idempotent; resolves immediately if already loaded)
isLoaded()  → boolean
```

Isolated behind a `GeometryKernel` interface for future testability. Not called in
this shell feature — loading infrastructure only.

---

---

### 6. `ControlPane` (Tweakpane host)

Singleton module that owns the Tweakpane `Pane` instance and ensures
`@tweakpane/plugin-essentials` is registered exactly once.

| Field | Type | Behaviour |
|-------|------|-----------|
| `pane` | `Pane` (tweakpane) | Mounted into `#scene-controls`; single instance |

**Operations**:
```
getPane()           → the shared Pane instance (read-only access for workflow elements)
addFolder(title)    → FolderApi (convenience wrapper over pane.addFolder)
dispose()           → pane.dispose() on teardown (hot-reload cleanup)
```

Workflow elements **must not** construct their own `Pane`. They receive `ControlPane`
and call `addFolder` to register their parameter section. The folder title matches
the part family name (e.g. `'Frame Part'`, `'Ring Part'`, `'Mesh Lattice'`).

---

## Module Map

```text
src/
├── layout/
│   ├── LayoutState.ts        # LayoutState interface + load/save/default functions
│   ├── LayoutState.test.ts
│   ├── DragHandle.ts         # Pointer event logic for pane resize
│   └── DragHandle.test.ts
├── scene/
│   ├── SceneRenderer.ts      # SceneRenderer interface (Three.js GL boundary)
│   ├── SceneManager.ts       # SceneManager aggregate root
│   └── SceneManager.test.ts  # Unit tests via MockSceneRenderer
├── viewport/
│   ├── Viewport.ts           # Three.js setup: scene, camera, renderer, OrbitControls
│   └── Viewport.test.ts      # ResizeObserver + camera aspect tests via mock renderer
├── occt/
│   ├── OccKernel.ts          # loadOcct() singleton + GeometryKernel interface
│   └── OccKernel.test.ts     # loadOcct idempotency test (mocked initOpenCascade)
├── controls/
│   ├── ControlPane.ts        # Tweakpane Pane init + plugin-essentials registration
│   └── ControlPane.test.ts   # getPane() returns singleton; addFolder test
└── main.ts                   # Bootstrap: DOM wiring, RAF loop (excluded from coverage)
```

---

## Relationships

```
main.ts
  └─ creates THREE.WebGLRenderer (via Viewport)
  └─ creates THREE.PerspectiveCamera + OrbitControls (via Viewport)
  └─ creates THREE.Scene
  └─ creates SceneManager(renderer, scene, camera)
  └─ calls loadOcct() → OccKernel singleton (WASM, async)
  └─ creates ControlPane(container) → Tweakpane Pane + plugin-essentials registered
  └─ adds THREE.AxesHelper via SceneManager.addObject('axes', ...)
  └─ sets up DragHandle(paneEl, viewportEl, layoutState)
  └─ starts RAF loop → SceneManager.renderFrame() each frame

SceneManager
  └─ holds Map<id, THREE.Object3D>
  └─ holds THREE.Scene + THREE.PerspectiveCamera
  └─ each frame: renderer.render(scene, camera)

LayoutState  (localStorage ↔ DragHandle ↔ CSS custom properties)
OccKernel    (WASM singleton — loaded once at startup, used by future workflow elements)
```

---

## Validation Rules Summary

| Entity | Field | Rule |
|--------|-------|------|
| LayoutState | paneWidth | `200 ≤ x ≤ window.innerWidth * 0.5` |
| LayoutState | paneCollapsed | must be boolean |
| SceneManager.addObject | id | non-empty string |
| OccKernel.loadOcct | — | idempotent; safe to call multiple times |
