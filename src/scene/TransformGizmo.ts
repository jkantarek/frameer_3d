import type * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface TransformGizmoApi {
  attach(object: THREE.Object3D | undefined): void;
  detach(): void;
  setMode(mode: TransformMode): void;
  getHelper(): THREE.Object3D;
  onObjectChange(cb: () => void): void;
  onDragEnd(cb: () => void): void;
  dispose(): void;
}

type TcLike = THREE.EventDispatcher & {
  attach(obj: THREE.Object3D): void;
  detach(): void;
  setMode(mode: string): void;
  dispose(): void;
  getHelper(): THREE.Object3D;
};

type TcFactory = (camera: THREE.Camera, domElement: HTMLElement) => TcLike;

/* v8 ignore start */
function defaultFactory(camera: THREE.Camera, domElement: HTMLElement): TcLike {
  return new TransformControls(camera, domElement);
}
/* v8 ignore stop */

export function createTransformGizmo(
  camera: THREE.Camera,
  domElement: HTMLElement,
  orbitControls: OrbitControls,
  _tcFactory: TcFactory = defaultFactory,
): TransformGizmoApi {
  const tc = _tcFactory(camera, domElement);

  const objectChangeCallbacks: (() => void)[] = [];
  const dragEndCallbacks: (() => void)[] = [];

  tc.addEventListener('dragging-changed', (ev: { value: boolean }) => {
    orbitControls.enabled = !ev.value;
    if (!ev.value) {
      for (const cb of dragEndCallbacks) cb();
    }
  });

  tc.addEventListener('objectChange', () => {
    for (const cb of objectChangeCallbacks) cb();
  });

  return {
    attach(object: THREE.Object3D | undefined): void {
      if (object !== undefined) tc.attach(object);
    },
    detach(): void {
      tc.detach();
    },
    setMode(mode: TransformMode): void {
      tc.setMode(mode);
    },
    getHelper(): THREE.Object3D {
      return tc.getHelper();
    },
    onObjectChange(cb: () => void): void {
      objectChangeCallbacks.push(cb);
    },
    onDragEnd(cb: () => void): void {
      dragEndCallbacks.push(cb);
    },
    dispose(): void {
      tc.dispose();
    },
  };
}
