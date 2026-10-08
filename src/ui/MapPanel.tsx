import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import type { Dataset, Detection } from '@/domain/models';
import { dayNightLabel, processingLabel, satelliteLabel } from '@/lib/presentation';
import { Icon } from '@/ui/Icon';
import { Term } from '@/ui/Term';

type BaseLayer = 'none' | 'nasa';
type ColorMode = 'stage' | 'confidence';
const layers = {
  nasa: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
    attribution:
      '<a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a> · Blue Marble (referencia estática)',
    maxNativeZoom: 8,
  },
} as const;
const confidenceStyle = {
  h: { color: '#fff7ed', fillColor: '#fb923c', dashArray: undefined, weight: 2.5 },
  n: { color: '#fde68a', fillColor: '#d97706', dashArray: '4 2', weight: 2 },
  l: { color: '#e0f2fe', fillColor: '#38bdf8', dashArray: '1 2', weight: 2 },
} as const;

function markerStyle(point: Detection, fresh: boolean, mode: ColorMode) {
  if (mode === 'confidence') return { ...confidenceStyle[point.confidence], fillOpacity: 0.9 };
  return {
    color: fresh ? '#fff7ed' : '#8d6a52',
    fillColor: fresh ? '#fb923c' : '#a26842',
    fillOpacity: fresh ? 0.9 : 0.45,
    weight: fresh ? 3 : 1,
    dashArray: fresh ? undefined : '2 2',
  };
}

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
  const [colorMode, setColorMode] = useState<ColorMode>('stage');
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
        </div>
        <div className="map-toolbar-controls">
          <div className="color-mode" role="radiogroup" aria-label="Color de las detecciones">
            <label>
              <input
                type="radio"
                name="detection-color"
                value="stage"
                checked={colorMode === 'stage'}
                onChange={() => setColorMode('stage')}
              />
              Por etapa
            </label>
            <label>
              <input
                type="radio"
                name="detection-color"
                value="confidence"
                checked={colorMode === 'confidence'}
                onChange={() => setColorMode('confidence')}
              />
              Por confianza
            </label>
          </div>
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
          <span className="base-note">Blue Marble es un fondo fijo.</span>
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
                pathOptions={markerStyle(point, fresh, colorMode)}
              >
                <Popup>
                  <strong>
                    Detección <Term id="viirs">VIIRS</Term> · {satelliteLabel(point.satellite)}
                  </strong>
                  <p>
                    {point.acquiredAt.replace('T', ' ').slice(0, 19)} <Term id="utc">UTC</Term>
                    <br />
                    {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                    <br />
                    <Term id="frp">FRP</Term>: {point.frp.toFixed(1)} <Term id="mw">MW</Term>
                    <br />
                    <Term id="confianza">Confianza</Term>:{' '}
                    {{ l: 'baja', n: 'nominal', h: 'alta' }[point.confidence]}
                    <br />
                    {dayNightLabel(point.dayNight)} · {processingLabel(point.version)}
                    <br />
                    <Term id="huella">Huella</Term>: {point.scan} × {point.track} km
                  </p>
                  <small>Huella = tamaño del píxel del sensor.</small>
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
          {colorMode === 'stage' ? (
            <>
              <span>
                <i className="orange-dot" /> Lectura actual
              </span>
              <span>
                <i className="old-dot" /> Lecturas anteriores
              </span>
            </>
          ) : (
            <>
              <span>
                <i className="confidence-dot high" /> Alta, borde continuo
              </span>
              <span>
                <i className="confidence-dot nominal" /> Nominal, borde discontinuo
              </span>
              <span>
                <i className="confidence-dot low" /> Baja, borde punteado
              </span>
            </>
          )}
          <span>Tamaño = FRP, no área quemada</span>
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
