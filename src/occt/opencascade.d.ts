declare module 'opencascade.js' {
  export type OpenCascadeInstance = unknown;
  export function initOpenCascade(): Promise<OpenCascadeInstance>;
}

declare module 'opencascade.js/dist/opencascade.wasm.js' {
  type LocateFn = (path: string) => string;
  type GlueFactory = (opts: { locateFile: LocateFn }) => Promise<unknown>;
  const opencascadeGlue: GlueFactory;
  export default opencascadeGlue;
}
