import type { Dataset, Detection } from '@/domain/models';

export type ResourceKind = 'field' | 'logistics' | 'analysis';
export type Resources = Record<ResourceKind, number>;
export const capacity: Readonly<Resources> = { field: 3, logistics: 2, analysis: 2 };
export interface Choice {
  id: string;
  title: string;
  description: string;
  cost: Partial<Resources>;
  hold: number;
  score: number;
  feedback: string;
}
export interface Stage {
  title: string;
  prompt: string;
  criterion: string;
  choices: Choice[];
}
export const stages: readonly Stage[] = [
  {
    title: 'Interpretar la primera lectura',
    criterion: 'Interpretación',
    prompt: 'Hay anomalías térmicas en el sector. ¿Qué información llevarías al equipo?',
    choices: [
      {
        id: 'interpret-detections',
        title: 'Informar puntos y nivel de confianza',
        description: 'Documentar coordenadas, hora y límites de la lectura.',
        cost: { analysis: 1 },
        hold: 2,
        score: 25,
        feedback:
          'Registraste lo observado sin convertir las detecciones en un perímetro. Se reserva un analista durante dos etapas.',
      },
      {
        id: 'interpret-wait',
        title: 'Esperar otra adquisición',
        description: 'Conservar capacidad sin emitir un informe inicial.',
        cost: {},
        hold: 1,
        score: 10,
        feedback:
          'Conservaste recursos, pero dejaste sin comunicar una observación ya disponible. La espera por sí sola no confirma ni descarta actividad.',
      },
      {
        id: 'interpret-perimeter',
        title: 'Dibujar un frente uniendo los puntos',
        description: 'Entregar una línea continua como límite del incendio.',
        cost: { analysis: 2 },
        hold: 2,
        score: 0,
        feedback:
          'Los puntos VIIRS no definen un frente continuo. La rúbrica penaliza presentar una inferencia geométrica como una observación.',
      },
    ],
  },
  {
    title: 'Contrastar la nueva información',
    criterion: 'Verificación',
    prompt: 'Compara esta adquisición con la anterior. ¿Cómo reducirías la incertidumbre?',
    choices: [
      {
        id: 'verify-field',
        title: 'Solicitar verificación de campo',
        description: 'Cruzar la lectura con un reporte independiente.',
        cost: { field: 1, logistics: 1 },
        hold: 2,
        score: 25,
        feedback:
          'Asignaste un equipo y logística para contrastar la lectura. El ejercicio registra la solicitud; no inventa un reporte de campo recibido.',
      },
      {
        id: 'verify-satellite',
        title: 'Comparar solo las lecturas satelitales',
        description: 'Revisar tiempo, confianza y huella de cada detección.',
        cost: { analysis: 1 },
        hold: 1,
        score: 15,
        feedback:
          'La comparación ayuda a describir las observaciones. Sigue faltando una fuente independiente para confirmar condiciones en terreno.',
      },
      {
        id: 'verify-spread',
        title: 'Asumir que más puntos significa expansión',
        description: 'Reportar crecimiento a partir del conteo acumulado.',
        cost: {},
        hold: 1,
        score: 0,
        feedback:
          'Un cambio en el conteo también depende del muestreo y la cobertura. No demuestra por sí solo expansión ni una velocidad de propagación.',
      },
    ],
  },
  {
    title: 'Preparar una respuesta',
    criterion: 'Planificación',
    prompt:
      'Aún no tienes un censo, rutas verificadas ni viento observado. ¿Qué prepararías con los recursos restantes?',
    choices: [
      {
        id: 'prepare-contingency',
        title: 'Preparar alternativas y pedir contexto local',
        description: 'Reservar apoyo para comunicaciones y coordinación.',
        cost: { field: 1, logistics: 1 },
        hold: 2,
        score: 25,
        feedback:
          'Preparaste capacidad sin asumir población expuesta, rutas transitables o dirección del viento. Es una decisión didáctica, no una orden operativa.',
      },
      {
        id: 'prepare-reserve',
        title: 'Mantener una reserva sin plan de coordinación',
        description: 'Dejar todos los recursos libres.',
        cost: {},
        hold: 1,
        score: 10,
        feedback:
          'Mantener una reserva puede ser útil, pero falta precisar qué información activarías y cómo coordinarías la siguiente acción.',
      },
      {
        id: 'prepare-all',
        title: 'Enviar todos los equipos al punto más intenso',
        description: 'Priorizar únicamente la mayor FRP observada.',
        cost: { field: 3 },
        hold: 2,
        score: 0,
        feedback:
          'La potencia radiativa no determina por sí sola la prioridad operativa, el acceso o la seguridad. Además, esta asignación deja menos margen de respuesta.',
      },
    ],
  },
  {
    title: 'Cerrar la lectura, continuar el seguimiento',
    criterion: 'Continuidad',
    prompt: 'Llegaste al final de la ventana de datos. ¿Qué conclusión dejarías en el relevo?',
    choices: [
      {
        id: 'handoff-monitor',
        title: 'Entregar evidencia y pendientes al relevo',
        description: 'Documentar incertidumbres y solicitar seguimiento.',
        cost: { analysis: 1 },
        hold: 1,
        score: 25,
        feedback:
          'Separaste el fin del archivo del fin del evento. El relevo recibe las observaciones, sus límites y las verificaciones pendientes.',
      },
      {
        id: 'handoff-summary',
        title: 'Archivar solo el conteo de detecciones',
        description: 'Guardar un resumen sin contexto de confianza.',
        cost: {},
        hold: 1,
        score: 10,
        feedback:
          'El conteo es verificable, pero el relevo pierde los tiempos, niveles de confianza y límites necesarios para interpretarlo.',
      },
      {
        id: 'handoff-close',
        title: 'Declarar controlado el incendio',
        description: 'Dar por cerrado el evento al terminar los datos.',
        cost: {},
        hold: 1,
        score: 0,
        feedback:
          'Que el archivo termine no demuestra que el incendio esté controlado. NASA FIRMS no aporta aquí una confirmación de contención.',
      },
    ],
  },
];
export interface Frame {
  at: string;
  observations: Detection[];
}
export interface Decision {
  frame: number;
  at: string;
  choice: Choice;
  note: string;
}
export interface Session {
  dataset: Dataset;
  frames: Frame[];
  history: Decision[];
}

/** Boundaries always fall on observed timestamps. Never synthesize minute-by-minute fire movement. */
export function createSession(dataset: Dataset): Session {
  const observations = [...dataset.observations].sort((a, b) =>
    a.acquiredAt.localeCompare(b.acquiredAt),
  );
  const times = [...new Set(observations.map((p) => p.acquiredAt))];
  const count = Math.min(4, times.length);
  const frames: Frame[] = [];
  for (let i = 0; i < count; i++) {
    const at = times[Math.ceil(((i + 1) * times.length) / count) - 1];
    if (!at) continue;
    const previous = frames.at(-1)?.at;
    frames.push({
      at,
      observations: observations.filter(
        (p) => (!previous || p.acquiredAt > previous) && p.acquiredAt <= at,
      ),
    });
  }
  return { dataset, frames, history: [] };
}
export function stageFor(session: Session, frameIndex: number): Stage {
  const index =
    session.frames.length <= 1 ? 0 : Math.round((frameIndex * 3) / (session.frames.length - 1));
  const stage = stages[index];
  if (!stage) throw new Error('Etapa fuera del ejercicio.');
  return stage;
}
export interface Reservation {
  kind: ResourceKind;
  amount: number;
  returnsAt: number;
}
export function reservations(session: Session, index: number): Reservation[] {
  const result: Reservation[] = [];
  for (const entry of session.history) {
    if (entry.frame >= index || entry.frame + entry.choice.hold <= index) continue;
    for (const kind of Object.keys(capacity) as ResourceKind[]) {
      const amount = entry.choice.cost[kind] ?? 0;
      if (!amount) continue;
      result.push({ kind, amount, returnsAt: entry.frame + entry.choice.hold });
    }
  }
  return result;
}
export function availableResources(session: Session, index = session.history.length): Resources {
  const result = { ...capacity };
  for (const item of reservations(session, index)) result[item.kind] -= item.amount;
  return result;
}
export interface Shortfall {
  kind: ResourceKind;
  need: number;
  have: number;
}
export function shortfall(choice: Choice, resources: Resources): Shortfall[] {
  return (Object.keys(capacity) as ResourceKind[]).flatMap((kind) => {
    const need = choice.cost[kind] ?? 0;
    const have = resources[kind];
    return have < need ? [{ kind, need, have }] : [];
  });
}
export function canAfford(choice: Choice, resources: Resources): boolean {
  return (Object.keys(capacity) as ResourceKind[]).every(
    (key) => resources[key] >= (choice.cost[key] ?? 0),
  );
}
export function visibleObservations(session: Session, index: number): Detection[] {
  if (index < 0 || index > session.history.length || index >= session.frames.length) return [];
  const at = session.frames[index]?.at;
  return session.dataset.observations.filter((p) => at !== undefined && p.acquiredAt <= at);
}
export function commitDecision(
  session: Session,
  frameIndex: number,
  choiceId: string,
  note = '',
): Session {
  if (frameIndex !== session.history.length || frameIndex >= session.frames.length)
    throw new Error('Esta etapa ya fue resuelta o está bloqueada.');
  const choice = stageFor(session, frameIndex).choices.find((c) => c.id === choiceId);
  if (!choice || !canAfford(choice, availableResources(session)))
    throw new Error('La acción no está disponible con estos recursos.');
  const frame = session.frames[frameIndex];
  if (!frame) throw new Error('Falta la lectura actual.');
  return {
    ...session,
    history: [
      ...session.history,
      { frame: frameIndex, at: frame.at, choice, note: note.slice(0, 500) },
    ],
  };
}
export function trainingScore(session: Session): number {
  return session.frames.length
    ? Math.round(
        (session.history.reduce((sum, d) => sum + d.choice.score, 0) /
          (session.frames.length * 25)) *
          100,
      )
    : 0;
}
