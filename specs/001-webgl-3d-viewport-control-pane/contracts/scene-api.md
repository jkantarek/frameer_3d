# Contracts: SceneManager Public API

**Phase**: 1 — Design  
**Branch**: `001-webgl-3d-viewport-control-pane`  
**Date**: 2026-04-28  
**Revision**: Updated — Three.js + OpenCASCADE.js (WASM)

This document defines the TypeScript contracts (interfaces and class signatures) that
all future workflow elements depend on. These contracts are the stable surface; internal
implementations may change freely.

---

## SceneRenderer Interface (GL boundary)

```typescript
// src/scene/SceneRenderer.ts
import type { PerspectiveCamera, Scene } from 'three';

/**
 * Thin abstraction over THREE.WebGLRenderer.
 * Allows MockSceneRenderer in Vitest (jsdom has no WebGL).
 */
export interface SceneRenderer {
  render(scene: Scene, camera: PerspectiveCamera): void;
  setSize(width: number, height: number): void;
}
```

`THREE.WebGLRenderer` structurally satisfies this interface (duck typing).

---

## SceneManager Public API

```typescript
// src/scene/SceneManager.ts
import type { Object3D, PerspectiveCamera } from 'three';
import type { SceneRenderer } from './SceneRenderer.js';

export class SceneManager {
  constructor(renderer: SceneRenderer, camera: PerspectiveCamera) { /* ... */ }

  /**
   * Add or replace a Three.js object in the scene.
   * @throws {Error} if id is an empty string.
   */
  addObject(id: string, object: Object3D): void;

  /**
   * Remove a Three.js object from the scene.
   * No-op if the id does not exist.
   */
  removeObject(id: string): void;

  /**
   * Retrieve an object by id.
   * Returns undefined if not present.
   */
  getObject(id: string): Object3D | undefined;

  /** Expose the camera to workflow elements. */
  getCamera(): PerspectiveCamera;

  /**
   * Called once per animation frame by the RAF loop in main.ts.
   * Delegates to renderer.render(scene, camera).
   */
  renderFrame(): void;
}
```

---

## LayoutState Interface

```typescript
// src/layout/LayoutState.ts

export interface LayoutState {
  /** Width of the control pane in CSS pixels. Min 200, max 50% of window. */
  paneWidth: number;
  /** Whether the pane is in collapsed (icon-bar) mode. */
  paneCollapsed: boolean;
}

/** Load from localStorage, returning defaults on any failure. */
export function loadLayoutState(): LayoutState;

/** Persist to localStorage; logs warning on failure (quota, private mode). */
export function saveLayoutState(state: LayoutState): void;

/** Return the default layout state using current window dimensions. */
export function defaultLayoutState(): LayoutState;
```

---

## OccKernel Interface

```typescript
// src/occt/OccKernel.ts
import type { OpenCascadeInstance } from 'opencascade.js';

/**
 * Abstraction over the WASM module for future testability.
 * Workflow elements that need OCCT receive GeometryKernel, not the raw instance.
 */
export interface GeometryKernel {
  readonly instance: OpenCascadeInstance;
}

/** Load the OpenCASCADE WASM module. Idempotent. */
export function loadOcct(): Promise<GeometryKernel>;

/** Returns true if the WASM module has already been loaded. */
export function isOcctLoaded(): boolean;
```

## ControlPane Interface

```typescript
// src/controls/ControlPane.ts
import type { Pane, FolderApi } from 'tweakpane';

/**
 * Singleton host for the shared Tweakpane instance.
 * Workflow elements call addFolder() to inject their parameter UI.
 * Never construct a new Pane directly — always use this module.
 */
export interface ControlPaneApi {
  /** The underlying Tweakpane Pane instance. Read-only for workflow elements. */
  readonly pane: Pane;
  /**
   * Add a named folder to the shared pane.
   * Each workflow element should call this once during its initialisation.
   * Folder title should match the part family name (e.g. 'Frame Part').
   */
  addFolder(title: string): FolderApi;
  /** Dispose the pane (called on hot-reload teardown). */
  dispose(): void;
}

/**
 * Create the ControlPane singleton mounted into the given container.
 * Registers @tweakpane/plugin-essentials exactly once.
 */
export function createControlPane(container: HTMLElement): ControlPaneApi;
```

---

1. **SceneRenderer**, **SceneManager**, **LayoutState**, and **GeometryKernel** contracts
   are frozen after first implementation. Any change requires a spec amendment.
2. `SceneManager.addObject` / `removeObject` / `getCamera` are the only methods
   workflow elements are permitted to call.
3. `renderFrame()` is called exclusively by the RAF loop in `main.ts`.
4. Workflow elements receive `THREE.Object3D` subclasses — they own their geometry
   and materials. OCCT shapes must be tessellated to `THREE.BufferGeometry` before
   passing to `addObject`.
5. `LayoutState` keys may be extended (additive only) without a breaking change;
   removal or type change requires a storage key version bump (`frameer3d.v2.layout`).
6. **ControlPaneApi** is frozen after first implementation. Workflow elements call
   `addFolder` only; they must not access `pane` directly or register additional plugins.
