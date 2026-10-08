import { mkdir, rename } from 'node:fs/promises';
import { parseFirmsCsv } from '@/data/firms';
import { type Bbox, datasetSchema } from '@/domain/models';

const sourceUrl =
  'https://firms.modaps.eosdis.nasa.gov/content/notebooks/sample_viirs_snpp_071223.csv';
const bbox: Bbox = [-123, 53, -120, 56];
const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`NASA: HTTP ${response.status}`);
const csv = await response.text();
const parsed = parseFirmsCsv(csv, bbox);
if (parsed.observations.length < 1)
  throw new Error(
    'La fuente no contiene observaciones para el sector; se conserva el archivo anterior.',
  );
const dataset = datasetSchema.parse({
  id: 'bc-2023-07-12',
  title: 'Columbia Británica',
  subtitle: 'Sector central · Canadá · 12 julio 2023',
  bbox,
  sourceUrl,
  documentationUrl:
    'https://firms.modaps.eosdis.nasa.gov/content/academy/data_ingest/firms_data_ingest.html',
  retrievedAt: new Date().toISOString(),
  sourceSha256: new Bun.CryptoHasher('sha256').update(csv).digest('hex'),
  ...parsed,
});
await mkdir('public/data', { recursive: true });
await Bun.write('public/data/bc-2023-07-12.json.tmp', `${JSON.stringify(dataset, null, 2)}\n`);
await rename('public/data/bc-2023-07-12.json.tmp', 'public/data/bc-2023-07-12.json');
console.info(
  `NASA FIRMS: ${dataset.observations.length} observaciones reales guardadas, ${new Set(dataset.observations.map((p) => p.acquiredAt)).size} horas de adquisición.`,
);
