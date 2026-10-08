import { parseFirmsCsv } from '@/data/firms';
import {
  type Dataset,
  datasetSchema,
  eonetResponseSchema,
  firmsQuerySchema,
  firmsSourceLabels,
} from '@/domain/models';

export class ApiError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
const TTL = 10 * 60 * 1000;
async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) return item.value as T;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;
  const task = load()
    .then((value) => {
      if (cache.size >= 20) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      cache.set(key, { expires: Date.now() + TTL, value });
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
async function download(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(25000), redirect: 'error' });
  } catch {
    throw new ApiError(502, 'NASA no respondió a tiempo. Puedes continuar con el caso local.');
  }
  if (!response.ok)
    throw new ApiError(
      response.status === 429 ? 429 : 502,
      `NASA devolvió HTTP ${response.status}. Intenta nuevamente más tarde.`,
    );
  const limit = 20 * 1024 * 1024;
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError(502, 'NASA devolvió una respuesta vacía.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit)
        throw new ApiError(413, 'La respuesta es demasiado grande. Reduce la zona o los días.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return await new Blob(chunks as BlobPart[]).text();
}
export async function getEvents() {
  return cached('eonet', async () => {
    const raw = await download(
      'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=all&limit=12',
    );
    const result = eonetResponseSchema.safeParse(JSON.parse(raw));
    if (!result.success) throw new ApiError(502, 'El formato recibido de EONET no es válido.');
    return { ...result.data, retrievedAt: new Date().toISOString() };
  });
}
export async function getFirms(input: unknown, mapKey: string | undefined): Promise<Dataset> {
  const query = firmsQuerySchema.safeParse(input);
  if (!query.success)
    throw new ApiError(400, query.error.issues[0]?.message ?? 'Consulta inválida.');
  if (!mapKey)
    throw new ApiError(
      428,
      'Configura FIRMS_MAP_KEY en .env y reinicia bun dev. La clave gratuita se solicita en NASA FIRMS.',
    );
  const { bbox, source, date, days } = query.data;
  const key = JSON.stringify(query.data);
  return cached(key, async () => {
    // Host and product are fixed/allowlisted; arbitrary URLs are never accepted.
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${source}/${bbox.join(',')}/${days}/${date}`;
    const csv = await download(url);
    let parsed: ReturnType<typeof parseFirmsCsv>;
    try {
      parsed = parseFirmsCsv(csv, bbox);
    } catch {
      throw new ApiError(
        502,
        'FIRMS no devolvió datos VIIRS válidos. Comprueba la clave y la disponibilidad de la fuente para esas fechas.',
      );
    }
    if (parsed.observations.length > 15000)
      throw new ApiError(
        413,
        'Hay más de 15 000 detecciones. Reduce el área o la ventana temporal.',
      );
    return datasetSchema.parse({
      id: `firms-${source}-${date}`,
      title: `Sector ${bbox.map((value) => value.toFixed(1)).join(', ')}`,
      subtitle: `${firmsSourceLabels[source]} · ${date} · ${days} día${days === 1 ? '' : 's'}`,
      bbox,
      sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/api/area/',
      documentationUrl: 'https://firms.modaps.eosdis.nasa.gov/api/area/',
      sourceSha256: new Bun.CryptoHasher('sha256').update(csv).digest('hex'),
      retrievedAt: new Date().toISOString(),
      ...parsed,
    });
  });
}
