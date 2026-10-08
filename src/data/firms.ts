import Papa from 'papaparse';
import { type Bbox, type Detection, detectionSchema } from '@/domain/models';

/** FIRMS acq_time is HHMM in UTC, including values without leading zeros. */
export function acquisitionTime(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,4}$/.test(time))
    throw new Error('Fecha FIRMS inválida.');
  const padded = time.padStart(4, '0');
  const hour = Number(padded.slice(0, 2));
  const minute = Number(padded.slice(2));
  if (hour > 23 || minute > 59) throw new Error('Hora FIRMS inválida.');
  const iso = `${date}T${padded.slice(0, 2)}:${padded.slice(2)}:00.000Z`;
  if (!Number.isFinite(Date.parse(iso)) || new Date(iso).toISOString() !== iso)
    throw new Error('Fecha FIRMS inválida.');
  return iso;
}

const columns = [
  'latitude',
  'longitude',
  'acq_date',
  'acq_time',
  'frp',
  'confidence',
  'satellite',
  'version',
  'scan',
  'track',
  'daynight',
];
export function parseFirmsCsv(csv: string, bbox: Bbox) {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
  });
  if (result.errors.length || !columns.every((c) => result.meta.fields?.includes(c))) {
    throw new Error(
      'NASA no devolvió un CSV VIIRS válido. Revisa la fuente, la clave y la disponibilidad de fechas.',
    );
  }
  let rejectedRows = 0;
  let duplicatesRemoved = 0;
  const points = new Map<string, Detection>();
  for (const row of result.data) {
    try {
      if (columns.some((column) => row[column] === undefined || row[column]?.trim() === ''))
        throw new Error('Fila incompleta');
      const latitude = Number(row.latitude),
        longitude = Number(row.longitude);
      const acquiredAt = acquisitionTime(row.acq_date ?? '', row.acq_time ?? '');
      const id = `${row.satellite}:${acquiredAt}:${latitude}:${longitude}`;
      const point = detectionSchema.parse({
        id,
        latitude,
        longitude,
        acquiredAt,
        frp: Number(row.frp),
        confidence: row.confidence,
        satellite: row.satellite,
        version: row.version,
        scan: Number(row.scan),
        track: Number(row.track),
        dayNight: row.daynight,
      });
      if (longitude < bbox[0] || longitude > bbox[2] || latitude < bbox[1] || latitude > bbox[3])
        continue;
      const previous = points.get(id);
      if (previous) {
        duplicatesRemoved++;
        // Prefer the processed record over an ultra/real-time copy of the same observation.
        if (previous.version.includes('NRT') || !point.version.includes('NRT')) continue;
      }
      points.set(id, point);
    } catch {
      rejectedRows++;
    }
  }
  return {
    observations: [...points.values()].sort(
      (a, b) => a.acquiredAt.localeCompare(b.acquiredAt) || a.id.localeCompare(b.id),
    ),
    sourceRows: result.data.length,
    rejectedRows,
    duplicatesRemoved,
  };
}
