import opencascadeGlue from 'opencascade.js/dist/opencascade.wasm.js';
import wasmUrl from 'opencascade.js/dist/opencascade.wasm.wasm?url';

export type OpenCascadeInstance = unknown;

/* v8 ignore start */
export function initOpenCascade(): Promise<OpenCascadeInstance> {
  return opencascadeGlue({
    locateFile(path: string): string {
      if (path.endsWith('.wasm')) {
        return wasmUrl;
      }
      return path;
    },
  });
}
/* v8 ignore end */
