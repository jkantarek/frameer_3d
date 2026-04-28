import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./opencascade-wrapper.js', () => ({
  initOpenCascade: vi.fn().mockResolvedValue({ version: 'mock' }),
}));

describe('OccKernel', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('isOcctLoaded returns false before any call', async () => {
    const { isOcctLoaded } = await import('./OccKernel.js');
    expect(isOcctLoaded()).toBe(false);
  });

  it('loadOcct resolves to the same GeometryKernel on sequential calls', async () => {
    const { loadOcct } = await import('./OccKernel.js');
    const k1 = await loadOcct();
    const k2 = await loadOcct();
    expect(k1).toBe(k2);
  });

  it('isOcctLoaded returns true after loadOcct resolves', async () => {
    const { loadOcct, isOcctLoaded } = await import('./OccKernel.js');
    await loadOcct();
    expect(isOcctLoaded()).toBe(true);
  });

  it('concurrent calls return the same GeometryKernel', async () => {
    const { loadOcct } = await import('./OccKernel.js');
    const [k1, k2] = await Promise.all([loadOcct(), loadOcct()]);
    expect(k1).toBe(k2);
  });
});
