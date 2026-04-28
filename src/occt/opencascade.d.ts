declare module 'opencascade.js' {
  export type OpenCascadeInstance = unknown;
  export function initOpenCascade(): Promise<OpenCascadeInstance>;
}
