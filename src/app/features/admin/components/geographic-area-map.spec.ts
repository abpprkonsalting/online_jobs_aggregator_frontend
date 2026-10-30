import { describe, expect, it, vi } from 'vitest';
import { resolveLeafletApi } from './geographic-area-map';

describe('resolveLeafletApi', () => {
  it('uses named Leaflet exports when the dynamic import exposes them directly', () => {
    const leaflet = { map: vi.fn() } as unknown as typeof import('leaflet');

    expect(resolveLeafletApi(leaflet)).toBe(leaflet);
  });

  it('unwraps the default export when Leaflet is exposed as a CommonJS namespace', () => {
    const leaflet = { map: vi.fn() } as unknown as typeof import('leaflet');

    expect(resolveLeafletApi({ default: leaflet })).toBe(leaflet);
  });

  it('throws a clear error if the imported module does not expose Leaflet map()', () => {
    expect(() => resolveLeafletApi({ default: {} })).toThrow(
      'Leaflet failed to load: map API is unavailable.',
    );
  });
});
