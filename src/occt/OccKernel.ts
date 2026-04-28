import { initOpenCascade } from './opencascade-wrapper.js';
import type { OpenCascadeInstance } from './opencascade-wrapper.js';

export interface GeometryKernel {
  readonly instance: OpenCascadeInstance;
}

let kernel: GeometryKernel | null = null;
let kernelPromise: Promise<GeometryKernel> | null = null;

export function loadOcct(): Promise<GeometryKernel> {
  if (kernel !== null) return Promise.resolve(kernel);
  if (kernelPromise !== null) return kernelPromise;
  const p = initOpenCascade().then((instance) => {
    kernel = { instance };
    kernelPromise = null;
    return kernel;
  });
  kernelPromise = p;
  return p;
}

export function isOcctLoaded(): boolean {
  return kernel !== null;
}
