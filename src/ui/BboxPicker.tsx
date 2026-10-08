import { useEffect, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { type Bbox, bboxSchema } from '@/domain/models';

const gibs =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';

function parseBbox(value: string): Bbox | null {
  const parsed = bboxSchema.safeParse(value.split(',').map((part) => Number(part.trim())));
  return parsed.success ? parsed.data : null;
}
function formatBbox(bbox: Bbox): string {
  return bbox.map((value) => value.toFixed(3)).join(',');
}
function FitBounds({ bboxKey }: { bboxKey: string }) {
  const map = useMap();
  useEffect(() => {
    const bbox = parseBbox(bboxKey);
    if (!bbox) return;
    map.invalidateSize();
    map.fitBounds(
      [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ],
      { padding: [16, 16], animate: false },
    );
  }, [map, bboxKey]);
  return null;
}
function Clicks({ onPick }: { onPick: (point: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
}
export function BboxPicker({ value, onChange }: Props) {
  const bbox = parseBbox(value);
  const [trackedValue, setTrackedValue] = useState(value);
  const [anchor, setAnchor] = useState<{ lat: number; lng: number } | null>(null);
  const [hint, setHint] = useState(
    'Dos clics marcan el rectángulo. El campo de texto también vale.',
  );
  if (trackedValue !== value) {
    setTrackedValue(value);
    setAnchor(null);
  }
  function pick(point: { lat: number; lng: number }) {
    if (!anchor) {
      setAnchor(point);
      setHint('Primer vértice listo. El segundo clic cierra el área.');
      return;
    }
    const west = Math.min(anchor.lng, point.lng);
    const east = Math.max(anchor.lng, point.lng);
    const south = Math.min(anchor.lat, point.lat);
    const north = Math.max(anchor.lat, point.lat);
    if (east - west < 0.01 || north - south < 0.01) {
      setHint('Esa área es demasiado pequeña. Separa más los dos clics.');
      setAnchor(null);
      return;
    }
    onChange(formatBbox([west, south, east, north]));
    setHint('Área actualizada desde el mapa. Puedes corregirla en el campo de texto.');
    setAnchor(null);
  }
  const center: [number, number] = bbox
    ? [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2]
    : [0, -80];
  return (
    <div className="bbox-picker">
      <p className="form-help" role="status">
        {hint}
      </p>
      <MapContainer
        id="bbox-map"
        className="bbox-map"
        center={center}
        zoom={4}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={gibs} maxNativeZoom={8} maxZoom={8} />
        <FitBounds bboxKey={value} />
        <Clicks onPick={pick} />
        {bbox && (
          <Rectangle
            bounds={[
              [bbox[1], bbox[0]],
              [bbox[3], bbox[2]],
            ]}
            pathOptions={{ color: '#ff945f', weight: 2, fillOpacity: 0.12 }}
          />
        )}
        {anchor && (
          <CircleMarker
            center={[anchor.lat, anchor.lng]}
            radius={5}
            pathOptions={{ color: '#fff7ed', fillColor: '#ff945f', fillOpacity: 1 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
