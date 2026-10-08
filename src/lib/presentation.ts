import type { NaturalEvent } from '@/domain/models';
import {
  type Choice,
  capacity,
  type ResourceKind,
  type Session,
  trainingScore,
} from '@/domain/replay';

export const resourceLabels: Record<ResourceKind, string> = {
  field: 'Equipos',
  logistics: 'Logística',
  analysis: 'Analistas',
};
export function costLabel(choice: Choice): string {
  const parts = (Object.keys(capacity) as ResourceKind[])
    .filter((key) => choice.cost[key])
    .map((key) => `${choice.cost[key]} ${resourceLabels[key].toLowerCase()}`);
  return parts.length
    ? `${parts.join(' · ')} · ${choice.hold} etapa(s)`
    : 'Sin asignación de recursos';
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}
export function eventLocation(event: NaturalEvent) {
  for (const point of event.geometry) {
    if (
      point.type !== 'Point' ||
      !Array.isArray(point.coordinates) ||
      point.coordinates.length !== 2
    )
      continue;
    const [lon, lat] = point.coordinates;
    if (
      typeof lon === 'number' &&
      Number.isFinite(lon) &&
      Math.abs(lon) <= 180 &&
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      Math.abs(lat) <= 90
    ) {
      return { lon, lat, date: point.date.slice(0, 10) };
    }
  }
  return null;
}
export function exportReport(session: Session): void {
  const report = {
    version: 1,
    exportedAt: new Date().toISOString(),
    disclaimer:
      'Ejercicio didáctico. No es un protocolo operativo ni una evaluación de resultados reales.',
    score: trainingScore(session),
    dataset: session.dataset,
    decisions: session.history,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `disaster-replay-${session.dataset.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
