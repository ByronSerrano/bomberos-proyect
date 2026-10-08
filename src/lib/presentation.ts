import type { NaturalEvent } from '@/domain/models';
import {
  type Choice,
  capacity,
  type ResourceKind,
  type Session,
  type Shortfall,
  trainingScore,
} from '@/domain/replay';

export const resourceInfo: Record<
  ResourceKind,
  { label: string; singular: string; plural: string; description: string }
> = {
  field: {
    label: 'Equipos',
    singular: 'equipo',
    plural: 'equipos',
    description: 'Personal que enviarías a terreno.',
  },
  logistics: {
    label: 'Logística',
    singular: 'logística',
    plural: 'logísticas',
    description: 'Transporte y comunicaciones que acompañan a un equipo.',
  },
  analysis: {
    label: 'Analistas',
    singular: 'analista',
    plural: 'analistas',
    description: 'Quienes interpretan las lecturas y redactan informes.',
  },
};
export const unknowns = [
  'Viento y lluvia',
  'Población expuesta',
  'Rutas verificadas',
  'Reportes de campo',
  'Hora de publicación',
  'Confirmación de contención',
] as const;
export function resourceAmount(kind: ResourceKind, amount: number): string {
  const info = resourceInfo[kind];
  return `${amount} ${amount === 1 ? info.singular : info.plural}`;
}
export function holdLabel(hold: number): string {
  if (hold <= 1) return 'esta etapa';
  if (hold === 2) return 'esta etapa y la siguiente';
  return `${hold} etapas`;
}
export function costLabel(choice: Choice): string {
  const parts = (Object.keys(capacity) as ResourceKind[])
    .filter((key) => choice.cost[key])
    .map((key) => resourceAmount(key, choice.cost[key] ?? 0));
  return parts.length
    ? `${parts.join(' · ')} · ${holdLabel(choice.hold)}`
    : 'Sin asignación de recursos';
}
export function shortfallLabel(gaps: Shortfall[]): string {
  return gaps
    .map((gap) => {
      const noun = gap.need === 1 ? resourceInfo[gap.kind].singular : resourceInfo[gap.kind].plural;
      const libres = gap.have === 1 ? 'libre' : 'libres';
      return `Necesitas ${gap.need} ${noun}; hay ${gap.have} ${libres}`;
    })
    .join('. ');
}
const satellites: Record<string, string> = {
  N: 'Suomi NPP',
  N20: 'NOAA-20',
  N21: 'NOAA-21',
};
export function satelliteLabel(code: string): string {
  return satellites[code] ?? code;
}
export function processingLabel(version: string): string {
  const upper = version.toUpperCase();
  if (upper.includes('URT')) return 'URT';
  if (upper.includes('NRT')) return 'NRT';
  if (upper.includes('SP')) return 'SP';
  return version;
}
export function dayNightLabel(value: 'D' | 'N'): string {
  return value === 'D' ? 'Día' : 'Noche';
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
