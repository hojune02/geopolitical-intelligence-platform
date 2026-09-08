import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GeoJSONSource, Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';

import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(mapLibreWorkerUrl);

import type { Feature, FeatureCollection, Point } from 'geojson';

import type { MapBounds } from '../../api/map.api';

import { mapEventPointSchema, type MapEventPoint } from '../../schemas/map-event.schema';

import type { RegionId } from '../../stores/useFilterStore';

import type { MapMode } from '../../stores/useUIStore';

interface GeopoliticalMapProps {
  points: MapEventPoint[];

  mode: MapMode;

  region: RegionId;

  onBoundsChange: (bounds: MapBounds) => void;

  onEventSelect: (eventId: string) => void;
}

interface EventFeatureProperties {
  id: string;

  goldsteinScale: number;

  quadClass: number;

  eventDate: string;

  actor1Name: string | null;

  actor2Name: string | null;

  locationName: string | null;
}

interface ClusterSelection {
  sourceData: FeatureCollection<Point, EventFeatureProperties>;

  clusterId: number;

  total: number;

  offset: number;

  events: MapEventPoint[];

  loading: boolean;

  error: string | null;
}

const CLUSTER_SOURCE = 'events-clustered';

const RAW_SOURCE = 'events-raw';

const CLUSTER_LAYER = 'event-clusters';

const CLUSTER_COUNT_LAYER = 'event-cluster-count';

const POINT_LAYER = 'event-points';

const HEATMAP_LAYER = 'event-heatmap';

const MAP_MAX_ZOOM = 16;

const CLUSTER_PAGE_SIZE = 25;

const EMPTY_COLLECTION: FeatureCollection<Point, EventFeatureProperties> = {
  type: 'FeatureCollection',

  features: [],
};

const REGION_CAMERA: Record<
  RegionId,
  {
    center: [number, number];

    zoom: number;
  }
> = {
  global: {
    center: [0, 20],

    zoom: 1.5,
  },

  europe: {
    center: [15, 50],

    zoom: 3,
  },

  'middle-east': {
    center: [45, 30],

    zoom: 3.4,
  },

  'east-asia': {
    center: [120, 35],

    zoom: 3,
  },

  'north-america': {
    center: [-100, 40],

    zoom: 2.6,
  },
};

function normaliseLongitude(longitude: number): number {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function normaliseMapBounds(
  north: number,
  south: number,
  rawEast: number,
  rawWest: number,
): MapBounds {
  const longitudeSpan = rawEast - rawWest;

  /*
   * If the viewport covers the entire world,
   * do not normalise each endpoint separately.
   *
   * Doing so would turn:
   *
   *   west = -180
   *   east =  180
   *
   * into:
   *
   *   west = -180
   *   east = -180
   */
  if (longitudeSpan >= 359.999) {
    return {
      north,
      south,
      west: -180,
      east: 180,
    };
  }

  return {
    north,
    south,

    west: normaliseLongitude(rawWest),

    east: normaliseLongitude(rawEast),
  };
}

function createGeoJson(points: MapEventPoint[]): FeatureCollection<Point, EventFeatureProperties> {
  return {
    type: 'FeatureCollection',

    features: points.map((event) => ({
      type: 'Feature',

      geometry: {
        type: 'Point',

        coordinates: [event.longitude, event.latitude],
      },

      properties: {
        id: event.id,

        goldsteinScale: event.goldsteinScale,

        quadClass: event.quadClass,

        eventDate: event.eventDate,

        actor1Name: event.actor1Name,

        actor2Name: event.actor2Name,

        locationName: event.locationName,
      },
    })),
  };
}

function parseClusterLeaf(feature: Feature): MapEventPoint | null {
  if (feature.geometry.type !== 'Point') {
    return null;
  }

  const [longitude, latitude] = feature.geometry.coordinates;

  const result = mapEventPointSchema.safeParse({
    ...feature.properties,

    longitude,

    latitude,
  });

  return result.success ? result.data : null;
}

function setLayerVisibility(
  map: MapLibreMap,

  layerId: string,

  visible: boolean,
): void {
  if (map.getLayer(layerId) === undefined) {
    return;
  }

  map.setLayoutProperty(
    layerId,
    'visibility',

    visible ? 'visible' : 'none',
  );
}

function applyMapMode(map: MapLibreMap, mode: MapMode): void {
  const markersVisible = mode === 'markers';

  setLayerVisibility(map, CLUSTER_LAYER, markersVisible);

  setLayerVisibility(map, CLUSTER_COUNT_LAYER, markersVisible);

  setLayerVisibility(map, POINT_LAYER, markersVisible);

  setLayerVisibility(map, HEATMAP_LAYER, !markersVisible);
}

function setMapData(
  map: MapLibreMap,

  geoJson: FeatureCollection<Point, EventFeatureProperties>,

  mode: MapMode,
): void {
  const clustered = map.getSource(CLUSTER_SOURCE);

  const raw = map.getSource(RAW_SOURCE);

  if (clustered instanceof GeoJSONSource) {
    void clustered.setData(mode === 'markers' ? geoJson : EMPTY_COLLECTION);
  }

  if (raw instanceof GeoJSONSource) {
    void raw.setData(mode === 'heatmap' ? geoJson : EMPTY_COLLECTION);
  }
}
export function GeopoliticalMap({
  points,
  mode,
  region,
  onBoundsChange,
  onEventSelect,
}: GeopoliticalMapProps) {
  const [clusterSelection, setClusterSelection] = useState<ClusterSelection | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<MapLibreMap | null>(null);

  const modeRef = useRef<MapMode>(mode);

  const onBoundsChangeRef = useRef(onBoundsChange);

  const onEventSelectRef = useRef(onEventSelect);

  const geoJson = useMemo(
    () => createGeoJson(points),

    [points],
  );

  const geoJsonRef = useRef(geoJson);

  const loadClusterPage = useCallback((clusterId: number, total: number, offset: number) => {
    const map = mapRef.current;

    const sourceData = geoJsonRef.current;

    const source = map?.getSource(CLUSTER_SOURCE);

    if (!(source instanceof GeoJSONSource)) {
      return;
    }

    setClusterSelection((current) => ({
      sourceData,

      clusterId,

      total,

      offset,

      events:
        current?.clusterId === clusterId && current.sourceData === sourceData ? current.events : [],

      loading: true,

      error: null,
    }));

    void source
      .getClusterLeaves(clusterId, CLUSTER_PAGE_SIZE, offset)
      .then((features) => {
        if (mapRef.current !== map) {
          return;
        }

        const events = features
          .map((feature) => parseClusterLeaf(feature))
          .filter((event): event is MapEventPoint => event !== null);

        setClusterSelection((current) =>
          current?.clusterId === clusterId && current.sourceData === sourceData
            ? {
                sourceData,

                clusterId,

                total,

                offset,

                events,

                loading: false,

                error: null,
              }
            : current,
        );
      })
      .catch((caught: unknown) => {
        const message =
          caught instanceof Error ? caught.message : 'Unable to load the events in this cluster.';

        setClusterSelection((current) =>
          current?.clusterId === clusterId && current.sourceData === sourceData
            ? {
                ...current,

                loading: false,

                error: message,
              }
            : current,
        );
      });
  }, []);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  useEffect(() => {
    onEventSelectRef.current = onEventSelect;
  }, [onEventSelect]);

  useEffect(() => {
    geoJsonRef.current = geoJson;
  }, [geoJson]);

  useEffect(() => {
    const container = containerRef.current;

    if (container === null) {
      return;
    }

    const initialCamera = REGION_CAMERA.global;

    const map = new MapLibreMap({
      container,

      /*
       * Fine for development.
       * Replace with a production
       * tile/style provider later.
       */
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',

      center: initialCamera.center,

      zoom: initialCamera.zoom,

      minZoom: 1,

      maxZoom: MAP_MAX_ZOOM,
    });

    mapRef.current = map;

    map.addControl(new NavigationControl(), 'top-right');

    const emitBounds = (): void => {
      const bounds = map.getBounds();

      onBoundsChangeRef.current(
        normaliseMapBounds(
          bounds.getNorth(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getWest(),
        ),
      );
    };

    map.on('load', () => {
      map.addSource(CLUSTER_SOURCE, {
        type: 'geojson',

        data: EMPTY_COLLECTION,

        cluster: true,

        /*
         * GDELT commonly assigns many events the same city-level coordinates.
         * Keep those points clustered at the map's maximum zoom; otherwise the
         * coincident point markers overlap and incorrectly look like one event.
         */
        clusterMaxZoom: MAP_MAX_ZOOM,

        clusterRadius: 55,
      });

      map.addLayer({
        id: CLUSTER_LAYER,

        type: 'circle',

        source: CLUSTER_SOURCE,

        filter: ['has', 'point_count'],

        paint: {
          'circle-color': [
            'step',

            ['get', 'point_count'],

            '#55d9d0',

            50,
            '#b7f34a',

            250,
            '#f26b5e',
          ],

          'circle-radius': ['step', ['get', 'point_count'], 16, 50, 22, 250, 30, 1000, 38],

          'circle-opacity': 0.82,

          'circle-stroke-color': '#e7eee9',

          'circle-stroke-opacity': 0.6,

          'circle-stroke-width': 1,

          'circle-blur': 0.05,
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,

        type: 'symbol',

        source: CLUSTER_SOURCE,

        filter: ['has', 'point_count'],

        layout: {
          'text-field': '{point_count_abbreviated}',

          'text-size': 12,
        },

        paint: {
          'text-color': '#ffffff',
        },
      });

      map.addLayer({
        id: POINT_LAYER,

        type: 'circle',

        source: CLUSTER_SOURCE,

        filter: ['!', ['has', 'point_count']],

        paint: {
          'circle-radius': 6,

          'circle-color': [
            'interpolate',
            ['linear'],

            ['get', 'goldsteinScale'],

            -10,
            '#f26b5e',

            0,
            '#e8b95b',

            10,
            '#b7f34a',
          ],

          'circle-stroke-width': 1,

          'circle-stroke-color': '#e7eee9',
        },
      });

      map.addSource(RAW_SOURCE, {
        type: 'geojson',

        data: EMPTY_COLLECTION,
      });

      map.addLayer({
        id: HEATMAP_LAYER,

        type: 'heatmap',

        source: RAW_SOURCE,

        maxzoom: 12,

        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],

            ['get', 'goldsteinScale'],

            -10,
            1,

            0,
            0.45,

            10,
            0.15,
          ],

          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 8, 2.5],

          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 8, 22],

          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(5, 8, 6, 0)',
            0.2,
            '#163b36',
            0.4,
            '#55d9d0',
            0.65,
            '#b7f34a',
            0.82,
            '#e8b95b',
            1,
            '#f26b5e',
          ],

          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.9, 12, 0],
        },
      });

      applyMapMode(map, modeRef.current);

      setMapData(map, geoJsonRef.current, modeRef.current);

      applyMapMode(map, modeRef.current);

      setMapData(map, geoJsonRef.current, modeRef.current);

      emitBounds();

      map.on('click', CLUSTER_LAYER, (event) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: [CLUSTER_LAYER],
        });

        const feature = features[0];

        if (feature.geometry.type !== 'Point') {
          return;
        }

        const properties: unknown = feature.properties;

        if (typeof properties !== 'object' || properties === null) {
          return;
        }

        const clusterId = 'cluster_id' in properties ? properties.cluster_id : null;

        const pointCount = 'point_count' in properties ? properties.point_count : null;

        if (typeof clusterId !== 'number' || typeof pointCount !== 'number') {
          return;
        }

        const source = map.getSource(CLUSTER_SOURCE);

        if (!(source instanceof GeoJSONSource)) {
          return;
        }

        const coordinates = feature.geometry.coordinates;

        const longitude = coordinates[0];

        const latitude = coordinates[1];

        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
          return;
        }

        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          if (zoom <= MAP_MAX_ZOOM || map.getZoom() < MAP_MAX_ZOOM - 0.1) {
            setClusterSelection(null);

            map.easeTo({
              center: [longitude, latitude],
              zoom: Math.min(zoom, MAP_MAX_ZOOM),
            });

            return;
          }

          loadClusterPage(clusterId, pointCount, 0);
        });
      });

      map.on('click', POINT_LAYER, (event) => {
        const feature = event.features?.[0];

        if (feature === undefined) {
          return;
        }

        const properties: unknown = feature.properties;

        if (typeof properties !== 'object' || properties === null || !('id' in properties)) {
          return;
        }

        const eventId = properties.id;

        if (typeof eventId === 'string') {
          onEventSelectRef.current(eventId);
        }
      });

      const showPointer = (): void => {
        map.getCanvas().style.cursor = 'pointer';
      };

      const clearPointer = (): void => {
        map.getCanvas().style.cursor = '';
      };

      map.on('mouseenter', CLUSTER_LAYER, showPointer);

      map.on('mouseleave', CLUSTER_LAYER, clearPointer);

      map.on('mouseenter', POINT_LAYER, showPointer);

      map.on('mouseleave', POINT_LAYER, clearPointer);
    });

    map.on('moveend', emitBounds);

    map.on('movestart', () => {
      setClusterSelection(null);
    });

    return () => {
      map.remove();

      mapRef.current = null;
    };
  }, [loadClusterPage]);

  useEffect(() => {
    modeRef.current = mode;

    const map = mapRef.current;

    if (!map?.isStyleLoaded()) {
      return;
    }

    applyMapMode(map, mode);

    setMapData(map, geoJsonRef.current, mode);
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map?.isStyleLoaded()) {
      return;
    }

    setMapData(map, geoJson, mode);
  }, [geoJson, mode]);

  useEffect(() => {
    const map = mapRef.current;

    if (map === null) {
      return;
    }

    const camera = REGION_CAMERA[region];

    map.flyTo({
      center: camera.center,

      zoom: camera.zoom,

      essential: true,
    });
  }, [region]);

  const visibleClusterSelection =
    mode === 'markers' && clusterSelection?.sourceData === geoJson ? clusterSelection : null;

  return (
    <>
      <div className="map-container" ref={containerRef} />

      {visibleClusterSelection === null ? null : (
        <aside aria-label="Events in selected cluster" className="cluster-drilldown">
          <header className="cluster-drilldown-header">
            <div>
              <span>Cluster dossier</span>

              <strong>{visibleClusterSelection.total.toLocaleString()} events</strong>
            </div>

            <button
              aria-label="Close cluster events"
              onClick={() => {
                setClusterSelection(null);
              }}
              type="button"
            >
              ×
            </button>
          </header>

          <div className="cluster-event-list">
            {visibleClusterSelection.error === null ? null : (
              <p className="cluster-event-error">{visibleClusterSelection.error}</p>
            )}

            {visibleClusterSelection.loading && visibleClusterSelection.events.length === 0 ? (
              <p className="cluster-event-loading">Decrypting event records…</p>
            ) : null}

            {visibleClusterSelection.events.map((event) => (
              <button
                className="cluster-event"
                key={event.id}
                onClick={() => {
                  onEventSelectRef.current(event.id);
                }}
                type="button"
              >
                <span className="cluster-event-actors">
                  {event.actor1Name ?? 'Unknown actor'}
                  {' → '}
                  {event.actor2Name ?? 'Unknown actor'}
                </span>

                <span className="cluster-event-meta">
                  {event.eventDate} · {event.locationName ?? 'Unknown location'} · G{' '}
                  {event.goldsteinScale}
                </span>
              </button>
            ))}
          </div>

          <footer className="cluster-drilldown-footer">
            <span>
              {visibleClusterSelection.offset + 1}–
              {Math.min(
                visibleClusterSelection.offset + CLUSTER_PAGE_SIZE,
                visibleClusterSelection.total,
              )}{' '}
              of {visibleClusterSelection.total}
            </span>

            <div>
              <button
                disabled={visibleClusterSelection.offset === 0 || visibleClusterSelection.loading}
                onClick={() => {
                  loadClusterPage(
                    visibleClusterSelection.clusterId,
                    visibleClusterSelection.total,
                    Math.max(0, visibleClusterSelection.offset - CLUSTER_PAGE_SIZE),
                  );
                }}
                type="button"
              >
                Prev
              </button>

              <button
                disabled={
                  visibleClusterSelection.offset + CLUSTER_PAGE_SIZE >=
                    visibleClusterSelection.total || visibleClusterSelection.loading
                }
                onClick={() => {
                  loadClusterPage(
                    visibleClusterSelection.clusterId,
                    visibleClusterSelection.total,
                    visibleClusterSelection.offset + CLUSTER_PAGE_SIZE,
                  );
                }}
                type="button"
              >
                Next
              </button>
            </div>
          </footer>
        </aside>
      )}
    </>
  );
}
