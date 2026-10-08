import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import type { Dataset, Detection } from '@/domain/models';
import { Icon } from '@/ui/Icon';

type BaseLayer = 'none' | 'nasa';
const layers = {
  nasa: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
    attribution:
      '<a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a> · Blue Marble (referencia estática)',
    maxNativeZoom: 8,
  },
} as const;

function MapLifecycle({ bbox, reset }: { bbox: Dataset['bbox']; reset: number }) {
  const map = useMap();
  useEffect(() => {
    // A user-triggered reset is also a request to fit the dataset extent.
    void reset;
    map.invalidateSize();
    map.fitBounds(
      [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ],
      { padding: [32, 32], animate: false },
    );
  }, [map, bbox, reset]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

interface Props {
  bbox: Dataset['bbox'];
  observations: Detection[];
  currentIds: ReadonlySet<string>;
  at: string;
}
export function MapPanel({ bbox, observations, currentIds, at }: Props) {
  const [base, setBase] = useState<BaseLayer>('nasa');
  const [reset, setReset] = useState(0);
  const [tileError, setTileError] = useState(false);
  const tileEvents = useMemo(() => ({ tileerror: () => setTileError(true) }), []);
  const layer = base === 'nasa' ? layers.nasa : null;
  return (
    <>
      <div className="map-toolbar">
        <div className="flex items-center gap-2">
          <Icon name="MapPin" />
          <span>Mapa de observaciones</span>
          <span className="subtle-tag">2D</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="icon-button"
            aria-label="Centrar mapa"
            onClick={() => setReset((value) => value + 1)}
          >
            <Icon name="Focus" />
          </button>
          <select
            aria-label="Mapa base"
            value={base}
            onChange={(event) => {
              setBase(event.target.value as BaseLayer);
              setTileError(false);
            }}
          >
            <option value="nasa">NASA Blue Marble</option>
            <option value="none">Solo detecciones</option>
          </select>
        </div>
      </div>
      <section className="map-stage" aria-label="Detecciones térmicas georreferenciadas de NASA">
        <MapContainer
          id="map"
          center={[54.5, -121.5]}
          zoom={6}
          zoomControl={false}
          preferCanvas={false}
        >
          <MapLifecycle bbox={bbox} reset={reset} />
          {layer && (
            <TileLayer
              key={base}
              url={layer.url}
              attribution={layer.attribution}
              maxNativeZoom={layer.maxNativeZoom}
              maxZoom={18}
              eventHandlers={tileEvents}
            />
          )}
          <ZoomControl position="bottomright" zoomInTitle="Acercar" zoomOutTitle="Alejar" />
          {observations.map((point) => {
            const fresh = currentIds.has(point.id);
            return (
              <CircleMarker
                key={point.id}
                className="thermal-detection"
                center={[point.latitude, point.longitude]}
                radius={Math.min(11, 3.5 + Math.sqrt(point.frp) * 0.32)}
                pathOptions={{
                  color: fresh ? '#fed7aa' : '#c78658',
                  fillColor: fresh ? '#fb923c' : '#a26842',
                  fillOpacity: fresh ? 0.85 : 0.5,
                  weight: 1,
                }}
              >
                <Popup>
                  <strong>Detección VIIRS · {point.satellite}</strong>
                  <p>
                    {point.acquiredAt.replace('T', ' ').slice(0, 19)} UTC
                    <br />
                    {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                    <br />
                    FRP: {point.frp.toFixed(1)} MW
                    <br />
                    Confianza: {{ l: 'baja', n: 'nominal', h: 'alta' }[point.confidence]}
                    <br />
                    Huella: {point.scan} × {point.track} km
                  </p>
                  <small>Anomalía térmica observada; no perímetro.</small>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
        <div className="map-stamp">
          <span className="map-live-dot" />{' '}
          <span data-testid="map-time">
            {at.slice(0, 10)} · {at.slice(11, 16)} UTC
          </span>
          <small>HORA DE ADQUISICIÓN · UTC</small>
        </div>
        <div className="map-key">
          <span>
            <i className="orange-dot" /> Lectura actual
          </span>
          <span>
            <i className="old-dot" /> Lecturas anteriores
          </span>
        </div>
        <span className="map-north">N ↑</span>
        {tileError && (
          <p className="map-tile-notice" role="status">
            No se pudieron cargar algunas imágenes del fondo. Las detecciones siguen disponibles.
          </p>
        )}
      </section>
    </>
  );
}
