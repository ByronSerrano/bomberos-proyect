import { type Dataset, datasetSchema, eonetResponseSchema } from '@/domain/models';

export async function loadSample(signal?: AbortSignal): Promise<Dataset> {
  const response = await fetch('/data/bc-2023-07-12.json', { signal: signal ?? null });
  if (!response.ok)
    throw new Error('No se pudo cargar el caso local. Reintenta o ejecuta bun run data:sync.');
  return datasetSchema.parse(await response.json());
}
export async function requestJson(path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(30000),
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('El servidor local no respondió. Inicia el proyecto con bun dev.');
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'No se pudo completar la consulta.';
    throw new Error(message);
  }
  return body;
}
export async function loadEvents() {
  return eonetResponseSchema.parse(await requestJson('/api/events')).events;
}
