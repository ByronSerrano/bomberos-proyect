import { type Dispatch, useEffect, useMemo, useRef, useState } from 'react';
import {
  availableResources,
  canAfford,
  capacity,
  type Reservation,
  type ResourceKind,
  type Resources,
  reservations,
  shortfall,
  stageFor,
  visibleObservations,
} from '@/domain/replay';
import type { WorkspaceAction, WorkspaceState } from '@/domain/workspace';
import {
  holdLabel,
  resourceAmount,
  resourceInfo,
  shortfallLabel,
  unknowns,
} from '@/lib/presentation';
import { Icon, type IconName } from '@/ui/Icon';
import { MapPanel } from '@/ui/MapPanel';
import { Term } from '@/ui/Term';

const resourceIcons: Record<ResourceKind, IconName> = {
  field: 'Users',
  logistics: 'Truck',
  analysis: 'ScanSearch',
};

function meterSlots(
  kind: ResourceKind,
  resources: Resources,
  held: Reservation[],
  preview: number,
) {
  const occupied = held
    .filter((item) => item.kind === kind)
    .flatMap((item) => Array.from({ length: item.amount }, () => item.returnsAt));
  const freeCount = Math.max(0, resources[kind] - preview);
  const slots: { state: 'free' | 'preview' | 'held'; returnsAt?: number }[] = [];
  for (let i = 0; i < freeCount; i++) slots.push({ state: 'free' });
  for (let i = 0; i < preview; i++) slots.push({ state: 'preview' });
  for (const returnsAt of occupied) slots.push({ state: 'held', returnsAt });
  while (slots.length < capacity[kind]) slots.push({ state: 'free' });
  return slots.slice(0, capacity[kind]);
}

interface Props {
  state: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
}
export function Workspace({ state, dispatch }: Props) {
  const { session, frame: index, selected, note } = state;
  const visible = useMemo(
    () => (session ? visibleObservations(session, index) : []),
    [session, index],
  );
  const frame = session?.frames[index];
  const currentIds = useMemo(() => new Set(frame?.observations.map((point) => point.id)), [frame]);
  const decisionRef = useRef<HTMLElement>(null);
  const previousFrame = useRef(index);
  const historyLength = session?.history.length ?? 0;
  const [trackedHistory, setTrackedHistory] = useState(historyLength);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  if (trackedHistory !== historyLength) {
    setTrackedHistory(historyLength);
    setDismissedAt(null);
  }
  useEffect(() => {
    if (previousFrame.current !== index) {
      decisionRef.current?.focus({ preventScroll: true });
      previousFrame.current = index;
    }
  }, [index]);
  if (!session || !frame) return null;
  const stage = stageFor(session, index);
  const readonly = index < session.history.length;
  const complete = session.history.length === session.frames.length;
  const saved = session.history[index];
  const selectedChoice = stage.choices.find(
    (choice) => choice.id === (saved?.choice.id ?? selected),
  );
  const resources = availableResources(session, index);
  const held = reservations(session, index);
  const confident = visible.filter((point) => point.confidence !== 'l').length;
  const previous = index === session.history.length ? session.history[index - 1] : undefined;
  const showFeedback = Boolean(previous) && dismissedAt !== index;
  const previewChoice =
    !readonly && selectedChoice && canAfford(selectedChoice, resources) ? selectedChoice : null;
  return (
    <>
      <section className="intro-row">
        <div>
          <p className="eyebrow">EJERCICIO DE OBSERVACIÓN · {frame.at.slice(0, 10)}</p>
          <h1>
            {session.dataset.title}
            <span className="text-orange-400">.</span>
          </h1>
          <p className="intro-description">{session.dataset.subtitle}</p>
        </div>
        <div className="intro-actions">
          <span className="data-badge">
            <Icon name="Satellite" /> Datos reales
          </span>
          <button
            type="button"
            className="button-secondary"
            onClick={() => dispatch({ type: 'restart' })}
          >
            <Icon name="RotateCcw" /> Reiniciar
          </button>
        </div>
      </section>
      {state.notice && (
        <p className="replay-notice" role="status">
          {state.notice}
        </p>
      )}
      <div className="workspace-grid">
        <section className="map-card" aria-label="Mapa y evolución del incidente">
          <MapPanel
            bbox={session.dataset.bbox}
            observations={visible}
            currentIds={currentIds}
            at={frame.at}
          />
          <div className="timeline-header">
            <div>
              <span className="eyebrow">LÍNEA DE TIEMPO</span>
              <h2>La información llega por etapas</h2>
            </div>
            <span className="mono text-slate-400">
              {String(index + 1).padStart(2, '0')} /{' '}
              {String(session.frames.length).padStart(2, '0')}
            </span>
          </div>
          <fieldset className="timeline" aria-label="Etapas del replay">
            {session.frames.map((item, i) => {
              const locked = i > session.history.length;
              const seen = i < session.history.length;
              return (
                <button
                  key={item.at}
                  type="button"
                  className={`time-stop ${i === index ? 'active' : seen ? 'visited' : ''}`}
                  disabled={locked}
                  aria-current={i === index ? 'step' : undefined}
                  onClick={() => dispatch({ type: 'seek', frame: i })}
                >
                  <strong>{locked ? '— — : — —' : item.at.slice(11, 16)}</strong>
                  <small>
                    <Icon name={locked ? 'LockKeyhole' : seen ? 'Check' : 'Satellite'} />
                    {locked ? (
                      `Se revela al confirmar la etapa ${i}`
                    ) : (
                      <span>
                        +{item.observations.length}
                        {seen ? ` · ${stageFor(session, i).criterion}` : ' · Actual'}
                      </span>
                    )}
                  </small>
                </button>
              );
            })}
          </fieldset>
          <div className="map-note">
            <Icon name="BookOpen" /> Las detecciones son puntos observados. No representan el frente
            ni el área quemada.
          </div>
        </section>
        <aside className="command-panel">
          <section aria-labelledby="observations-heading">
            <div className="section-label">
              <h2 id="observations-heading">Lo que sabemos</h2>
              <span className="small-tag">OBSERVADO</span>
            </div>
            <div className="observation-list" aria-live="polite">
              <div className="observation">
                <span className="observation-icon">
                  <Icon name="Flame" />
                </span>
                <div>
                  <strong>
                    Nuevas: {frame.observations.length} · Acumuladas: {visible.length}
                  </strong>
                  <small>
                    Registros <Term id="viirs">VIIRS</Term> de esta etapa y del acumulado visible
                  </small>
                </div>
              </div>
              <div className="observation">
                <span className="observation-icon">
                  <Icon name="ShieldCheck" />
                </span>
                <div>
                  <strong>{confident} con confianza nominal o alta</strong>
                  <small>
                    {visible.length - confident} con <Term id="confianza">confianza</Term> baja ·
                    acumulado
                  </small>
                </div>
              </div>
              <div className="observation">
                <span className="observation-icon">
                  <Icon name="Activity" />
                </span>
                <div>
                  <strong>
                    <Term id="frp">FRP</Term> máxima:{' '}
                    {Math.max(0, ...visible.map((point) => point.frp)).toFixed(1)}{' '}
                    <Term id="mw">MW</Term>
                  </strong>
                  <small>Potencia radiativa observada · no área quemada</small>
                </div>
              </div>
            </div>
          </section>
          <section aria-labelledby="unknowns-heading">
            <div className="section-label">
              <h2 id="unknowns-heading">Lo que no sabemos</h2>
              <span className="small-tag muted-tag">NO DISPONIBLE</span>
            </div>
            <ul className="unknown-list">
              {unknowns.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="resource-section" aria-labelledby="resources-heading">
            <div className="section-label">
              <h2 id="resources-heading">Recursos disponibles</h2>
              <span className="small-tag muted-tag">EJERCICIO</span>
            </div>
            <div className="resource-grid">
              {(Object.keys(capacity) as ResourceKind[]).map((kind) => {
                const slots = meterSlots(kind, resources, held, previewChoice?.cost[kind] ?? 0);
                const returns = [
                  ...new Set(slots.flatMap((slot) => (slot.returnsAt ? [slot.returnsAt] : []))),
                ];
                return (
                  <div className="resource" key={kind}>
                    <div className="resource-top">
                      <Icon name={resourceIcons[kind]} />
                      <b>
                        {resources[kind]}
                        <span className="text-slate-500 text-sm">/{capacity[kind]}</span>
                      </b>
                    </div>
                    <small>{resourceInfo[kind].label}</small>
                    <p className="resource-description">{resourceInfo[kind].description}</p>
                    <div className="resource-meter" aria-hidden="true">
                      {slots.map((slot, i) => {
                        const name = ['alpha', 'bravo', 'charlie'][i] ?? 'delta';
                        return (
                          <i
                            key={`${kind}-${name}`}
                            className={
                              slot.state === 'free'
                                ? 'ready'
                                : slot.state === 'preview'
                                  ? 'preview'
                                  : 'held'
                            }
                          />
                        );
                      })}
                    </div>
                    {returns.length > 0 && (
                      <p className="resource-return">
                        Ocupado: vuelve en la etapa {returns.map((value) => value + 1).join(' y ')}
                      </p>
                    )}
                    {(previewChoice?.cost[kind] ?? 0) > 0 && (
                      <p className="resource-preview-label">Vista previa de la selección</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          {showFeedback && previous && (
            <section
              className="feedback-card"
              role="status"
              aria-label="Lo que registraste en la etapa anterior"
            >
              <div className="section-label">
                <h2>Lo que registraste en la etapa anterior</h2>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setDismissedAt(index)}
                >
                  Cerrar
                </button>
              </div>
              <p>{previous.choice.feedback}</p>
            </section>
          )}
          <section
            id="decision-panel"
            className="decision-panel"
            tabIndex={-1}
            aria-labelledby="decision-title"
            ref={decisionRef}
          >
            <p className="eyebrow accent">
              {readonly ? 'REVISIÓN' : 'TU TURNO'} · {stage.criterion}
            </p>
            <h2 id="decision-title">{stage.title}</h2>
            <p className="decision-description">{stage.prompt}</p>
            <fieldset>
              <legend className="sr-only">Selecciona una acción para esta etapa</legend>
              <div className="choice-list">
                {stage.choices.map((choice) => {
                  const gaps = shortfall(choice, resources);
                  const blocked = !readonly && gaps.length > 0;
                  return (
                    <label className="choice" key={choice.id}>
                      <input
                        type="radio"
                        name="decision"
                        value={choice.id}
                        checked={(saved?.choice.id ?? selected) === choice.id}
                        disabled={readonly || blocked}
                        onChange={() => dispatch({ type: 'select', choice: choice.id })}
                      />
                      <span>
                        <strong>{choice.title}</strong>
                        <span className="cost-chips">
                          {(Object.keys(capacity) as ResourceKind[]).some(
                            (kind) => choice.cost[kind],
                          ) ? (
                            <>
                              {(Object.keys(capacity) as ResourceKind[])
                                .filter((kind) => choice.cost[kind])
                                .map((kind) => (
                                  <span className="cost-chip" key={kind}>
                                    <Icon name={resourceIcons[kind]} />
                                    {resourceAmount(kind, choice.cost[kind] ?? 0)}
                                  </span>
                                ))}
                              <span className="cost-chip">{holdLabel(choice.hold)}</span>
                            </>
                          ) : (
                            <span className="cost-chip">Sin asignación de recursos</span>
                          )}
                        </span>
                        {blocked && <small>{shortfallLabel(gaps)}</small>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {selectedChoice && (
              <div className="selected-impact">
                <p>{readonly ? selectedChoice.feedback : selectedChoice.description}</p>
                {!readonly && (
                  <label className="note-label">
                    Tu razonamiento <span>(opcional)</span>
                    <textarea
                      maxLength={500}
                      value={note}
                      onChange={(event) => dispatch({ type: 'note', value: event.target.value })}
                      placeholder="¿Qué sabes y qué falta por verificar?"
                      rows={2}
                    />
                  </label>
                )}
              </div>
            )}
            <button
              type="button"
              className="button-primary"
              disabled={!readonly && !selected}
              onClick={() => dispatch({ type: 'confirm', frame: index })}
            >
              {complete
                ? 'Ver debrief'
                : readonly
                  ? 'Volver a la etapa actual'
                  : index === session.frames.length - 1
                    ? 'Confirmar y ver debrief'
                    : 'Confirmar y avanzar'}{' '}
              <Icon name="ArrowRight" />
            </button>
            <p className="decision-hint">
              Tu decisión se guarda antes de revelar la siguiente lectura.
            </p>
          </section>
        </aside>
      </div>
      <section className="journal-section">
        <div className="section-label">
          <h2>
            <Icon name="Radio" /> Bitácora de decisiones
          </h2>
          <span className="muted text-sm">Solo se registra lo que ya decidiste</span>
        </div>
        {session.history.length ? (
          session.history.map((entry) => (
            <article className="journal-row" key={entry.frame}>
              <time dateTime={entry.at}>{entry.at.slice(11, 16)} UTC</time>
              <div>
                <strong>{entry.choice.title}</strong>
                <p>{entry.choice.feedback}</p>
                {entry.note && <p className="journal-note">Tu razonamiento: {entry.note}</p>}
              </div>
            </article>
          ))
        ) : (
          <p className="empty-journal">Tu primera decisión iniciará la bitácora.</p>
        )}
      </section>
    </>
  );
}
