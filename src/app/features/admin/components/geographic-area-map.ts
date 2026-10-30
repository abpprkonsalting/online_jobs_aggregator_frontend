import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import type { Map as LeafletMap, Polygon, LatLng } from 'leaflet';
import type { Polygon as GeoJsonPolygon } from 'geojson';

type LeafletApi = typeof import('leaflet');

export function resolveLeafletApi(moduleValue: unknown): LeafletApi {
  const namespace = moduleValue as { map?: unknown; default?: unknown } | null;
  const api = typeof namespace?.map === 'function' ? namespace : namespace?.default;
  if (!api || typeof (api as { map?: unknown }).map !== 'function') {
    throw new Error('Leaflet failed to load: map API is unavailable.');
  }
  return api as LeafletApi;
}

@Component({
  selector: 'app-geographic-area-map',
  standalone: true,
  template: `
    <div #mapElement class="map" role="application" aria-label="Map to draw a geographic area"></div>
    <p class="map-help">Click the map to add polygon corners, then select “Use polygon”. You need at least three corners.</p>
  `,
  styles: `
    :host { display: block; }
    .map { height: 24rem; min-height: 18rem; border: 1px solid var(--color-border); border-radius: 0.7rem; z-index: 0; }
    .map-help { margin: 0.5rem 0 0; color: var(--color-muted); font-size: 0.85rem; }
  `,
})
export class GeographicAreaMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapElement', { static: true }) private mapElement!: ElementRef<HTMLDivElement>;
  @Output() readonly polygonDrawn = new EventEmitter<GeoJsonPolygon>();

  private map?: LeafletMap;
  private polygon?: Polygon;
  private points: LatLng[] = [];
  private L?: typeof import('leaflet');
  private pendingBounds: { bbox: [number, number, number, number]; zoom: number } | null = null;

  async ngAfterViewInit(): Promise<void> {
    this.L = resolveLeafletApi(await import('leaflet'));
    const L = this.L;
    this.map = L.map(this.mapElement.nativeElement).setView([39.5, -98.35], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
    this.map.on('click', (event) => this.addPoint(event.latlng));
    this.map.on('dblclick', () => this.finishDrawing());
    this.renderPendingBounds();
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  centerOn(lat: number, lng: number): void {
    this.map?.setView([lat, lng], 12);
  }

  finishDrawing(): void {
    if (!this.L || this.points.length < 3) return;
    const coordinates = this.points.map(({ lat, lng }) => [lng, lat] as [number, number]);
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) coordinates.push(first);
    const polygon: GeoJsonPolygon = { type: 'Polygon', coordinates: [coordinates] };
    this.polygonDrawn.emit(polygon);
  }

  showBounds(bbox: [number, number, number, number], zoom: number): void {
    this.points = [];
    this.polygon?.remove();
    this.polygon = undefined;
    this.pendingBounds = { bbox, zoom };
    this.renderPendingBounds();
  }

  clearArea(): void {
    this.pendingBounds = null;
    this.points = [];
    this.polygon?.remove();
    this.polygon = undefined;
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private addPoint(point: LatLng): void {
    if (!this.L || !this.map) return;
    this.points.push(point);
    this.polygon?.remove();
    this.polygon = this.L.polygon(this.points, { color: '#146c63', fillOpacity: 0.2 }).addTo(this.map);
  }

  private renderPendingBounds(): void {
    if (!this.L || !this.map || !this.pendingBounds) return;
    const [minLongitude, minLatitude, maxLongitude, maxLatitude] = this.pendingBounds.bbox;
    const corners: [number, number][] = [
      [minLatitude, minLongitude],
      [minLatitude, maxLongitude],
      [maxLatitude, maxLongitude],
      [maxLatitude, minLongitude],
    ];
    this.polygon = this.L.polygon(corners, { color: '#146c63', fillOpacity: 0.2 }).addTo(this.map);
    this.map.setView(
      [(minLatitude + maxLatitude) / 2, (minLongitude + maxLongitude) / 2],
      this.pendingBounds.zoom,
    );
  }
}
