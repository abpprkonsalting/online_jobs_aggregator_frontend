import { describe, expect, it, vi } from 'vitest';
import { GeographicAreaMap, resolveLeafletApi } from './geographic-area-map';

describe('GeographicAreaMap', () => {
  let component: GeographicAreaMap;
  let mapInstance: { setView: ReturnType<typeof vi.fn> };
  let polygonLayer: { addTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let leafletApi: { polygon: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    component = new GeographicAreaMap();
    mapInstance = { setView: vi.fn() };
    polygonLayer = { addTo: vi.fn(), remove: vi.fn() };
    polygonLayer.addTo.mockReturnValue(polygonLayer);
    leafletApi = { polygon: vi.fn(() => polygonLayer) };
    Object.assign(component, { map: mapInstance, L: leafletApi });
  });

  it('draws the saved bounding box on the map and centers on it', () => {
    component.showBounds([-71.2, 42.1, -70.9, 42.5], 9);

    expect(leafletApi.polygon).toHaveBeenLastCalledWith(
      [[42.1, -71.2], [42.1, -70.9], [42.5, -70.9], [42.5, -71.2]],
      { color: '#146c63', fillOpacity: 0.2 },
    );
    const [center, zoom] = mapInstance.setView.mock.lastCall!;
    expect(center[0]).toBeCloseTo(42.3);
    expect(center[1]).toBeCloseTo(-71.05);
    expect(zoom).toBe(9);
  });

  it('removes the saved or drawn polygon when the area is cleared', () => {
    component.showBounds([-71.2, 42.1, -70.9, 42.5], 9);
    component.clearArea();

    expect(polygonLayer.remove).toHaveBeenCalledOnce();
  });
});

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
