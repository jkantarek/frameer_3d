/**
 * @example
 * ```ts @import.meta.vitest
 * expect(clamp(5, 0, 10)).toBe(5);
 * expect(clamp(-1, 0, 10)).toBe(0);
 * expect(clamp(11, 0, 10)).toBe(10);
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * @example
 * ```ts @import.meta.vitest
 * expect(lerp(0, 10, 0)).toBe(0);
 * expect(lerp(0, 10, 1)).toBe(10);
 * expect(lerp(0, 10, 0.5)).toBe(5);
 * ```
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * @example
 * ```ts @import.meta.vitest
 * expect(degToRad(0)).toBe(0);
 * expect(degToRad(180)).toBeCloseTo(Math.PI);
 * expect(degToRad(360)).toBeCloseTo(2 * Math.PI);
 * ```
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
