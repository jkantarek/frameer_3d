# Feature Spec: WebGL 3D Viewport + Control Pane Shell

**Branch**: `001-webgl-3d-viewport-control-pane`  
**Date**: 2026-04-28  
**Status**: Draft

---

## Overview

Establish the foundational application shell for Frameer 3D: a GPU-accelerated WebGL
viewport occupying 2/3 of the browser window paired with a collapsible **Tweakpane**
control pane occupying the remaining 1/3. This layout forms the primary housing for all
future workflow elements that will be injected into the 3D scene.

Everything runs **locally in the browser**. There are no backend services, no network
requests, and no server-side dependencies of any kind.

**Long-term project goal**: Frameer 3D is a browser-native port of the
`blender-mcp-tooling` Python/Blender parametric CAD toolkit. That toolkit generates
frames, rings, mesh-cell lattices, n-gon clusters, keeper bars, tie connectors, and
Boolean-cut vent-cover patterns. Each of those part families will become a
Tweakpane-driven workflow element in this application — using Three.js for rendering
and OpenCASCADE.js (WASM) as the geometry kernel in place of Blender.

---

## Goals

1. Render a WebGL 2 context optimised for GPU throughput (hardware-accelerated via
   `powerPreference: 'high-performance'`).
2. Present a persistent 2/3 + 1/3 split layout: left = 3D viewport, right = control
   pane.
3. The control pane must be collapsible/expandable (resize handle or toggle button)
   without unmounting the WebGL context.
4. The viewport must resize responsively with the window and preserve correct aspect
   ratio and projection matrix.
5. Provide a clear extension point (`SceneManager`) that future workflow elements will
   use to inject objects into the scene.
6. All state (camera, pane width, visibility) is persisted in `localStorage` so the
   user's layout survives page reload.

---

## Non-Goals

- No 3D mesh loading, import pipeline, or asset server (geometry is generated procedurally via OpenCASCADE.js).
- No authentication, user accounts, or cloud sync.
- No Babylon.js or other alternative 3D frameworks — Three.js is the chosen renderer.
- No server-side rendering or service workers.
- No raw WebGL 2 shader management — Three.js owns the GL context.

---

## Requirements

### R1 — Three.js Viewport
- Canvas fills the left 2/3 of the viewport.
- `THREE.WebGLRenderer` created with `antialias: true`, `powerPreference: 'high-performance'`.
- Renders at device pixel ratio via `renderer.setPixelRatio(window.devicePixelRatio)`.
- Default scene: dark background (`#1a1a2e`) + `THREE.AxesHelper`.
- Camera: `THREE.PerspectiveCamera`, 60° FoV, `THREE.OrbitControls` (drag to rotate, scroll to zoom).
- Renders via `requestAnimationFrame` loop; pauses when tab is hidden via Page Visibility API.

### R2 — Control Pane (Tweakpane)
- Occupies the right 1/3 of the window by default.
- Collapsible to a narrow icon bar (≥ 32 px) via a toggle affordance.
- Width is resizable by drag handle (min 200 px, max 50 % of window).
- Pane width and collapsed state persisted in `localStorage`.
- UI built with **Tweakpane** (`tweakpane` npm) mounted inside the pane container.
- **`@tweakpane/plugin-essentials`** registered at startup to provide interval inputs,
  radio grids, button grids, and FPS graph — the building blocks for workflow element UIs.
- The Tweakpane `Pane` instance is created once and exported from a `ControlPane` module;
  workflow elements add their own Tweakpane folders/bindings to it.
- Exposes a named container (`#scene-controls`) that the Tweakpane canvas is mounted into.

### R3 — Layout Shell
- Full-screen flexbox or CSS grid layout with no scroll on the outer shell.
- Viewport canvas is a direct sibling of the pane container (no iframes).
- The layout must not cause layout thrash when the pane is resized.

### R4 — Local-First State
- `localStorage` key: `frameer3d.layout` (JSON).
- Keys stored: `paneWidth`, `paneCollapsed`.
- Graceful fallback to defaults if storage is unavailable or corrupted.

### R5 — Extension API (SceneManager)
- Exported `SceneManager` class with:
  - `addObject(id: string, object: THREE.Object3D): void`
  - `removeObject(id: string): void`
  - `getCamera(): THREE.PerspectiveCamera`
- Workflow elements add `THREE.Object3D` subclasses directly; no custom render callback needed.
- OpenCASCADE.js geometry is converted to `THREE.BufferGeometry` before passing to `addObject`.

### R7 — OpenCASCADE.js Integration
- `opencascade.js` loaded asynchronously via WASM at startup.
- A singleton `OccKernel` module manages the WASM module lifecycle.
- WASM binary is a static build artifact (bundled in `dist/`) — do **not** load it from
  a third-party CDN you do not control.
- COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Embedder-Policy: require-corp`,
  `Cross-Origin-Resource-Policy: cross-origin`) must be set on the origin container
  (Caddy or Nginx in the Dokploy deployment). Cloudflare forwards origin headers and
  edge-caches the WASM binary automatically.
- OCCT is not used in this shell feature — only the loading infrastructure is established.

### R6 — Accessibility & UX
- Toggle button has `aria-expanded`, `aria-label`.
- Canvas has `role="img"` and `aria-label="3D viewport"`.
- Drag handle has `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow`.

### R8 — Deployment
- Hosted on a home server via **Cloudflare Tunnel** (cloudflared) with Cloudflare as the
  public-facing CDN. No cloud VPS required.
- Production container serves static `dist/` output via **Caddy** (`file_server`).
- COOP/COEP/CORP headers are set at the **origin (Caddy)** — not via Cloudflare rules —
  so they are version-controlled and work identically in local Docker and production:
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: cross-origin
  ```
- Vite content-hashes all build artifacts. Caddy's `file_server` sends correct `Etag`
  headers; Cloudflare caches hashed assets (JS, WASM) at the edge indefinitely.
  The ~25 MB WASM binary hits the home device **once per Cloudflare PoP** on warm-up,
  then is served from the edge for all subsequent requests.
- `index.html` (unhashed) is not cached by Cloudflare free tier and hits the origin on
  every navigation — acceptable for a low-traffic personal tool.
- Do **not** load the WASM binary from a third-party CDN (e.g. jsDelivr); the `CORP`
  header cannot be controlled on external origins.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC1 | WebGL 2 context initialises without error on Chrome/Firefox/Safari latest |
| AC2 | Control pane toggles collapsed/expanded; layout reflows without WebGL context loss |
| AC3 | Page reload restores pane width and collapsed state from localStorage |
| AC4 | Resizing window updates canvas dimensions and projection matrix within one frame |
| AC5 | `SceneManager.addObject` causes the Three.js object to appear in the rendered scene each frame |
| AC6 | All public TypeScript APIs have zero `any` types and pass strict tsconfig |
| AC7 | Coverage ≥ 98% on all metrics for non-GL code paths (GL calls tested via interface) |
| AC8 | ESLint reports zero warnings; Prettier check passes |
