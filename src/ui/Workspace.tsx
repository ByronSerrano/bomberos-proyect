import { type Dispatch, useEffect, useMemo, useRef } from 'react';
import {
  availableResources,
  canAfford,
  capacity,
  type ResourceKind,
  stageFor,
  visibleObservations,
} from '@/domain/replay';
import type { WorkspaceAction, WorkspaceState } from '@/domain/workspace';
import { costLabel, resourceLabels } from '@/lib/presentation';
import { Icon, type IconName } from '@/ui/Icon';
import { MapPanel } from '@/ui/MapPanel';

const resourceIcons: Record<ResourceKind, IconName> = {
  field: 'Users',
  logistics: 'Truck',
  analysis: 'Radio',
};
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
  const confident = visible.filter((point) => point.confidence !== 'l').length;
  const rows: { symbol: IconName; title: string; detail: string }[] = [
    {
      symbol: 'Flame',
      title: `${frame.observations.length} detecciones en esta etapa`,
      detail: `${visible.length} registros acumulados · VIIRS`,
    },
    {
      symbol: 'ShieldCheck',
      title: `${confident} con confianza nominal o alta`,
      detail: `${visible.length - confident} con confianza baja · acumulado`,
    },
    {
      symbol: 'Activity',
      title: `FRP máxima: ${Math.max(0, ...visible.map((point) => point.frp)).toFixed(1)} MW`,
      detail: 'Potencia radiativa observada · no área quemada',
    },
  ];
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
            {session.frames.map((item, i) => (
              <button
                key={item.at}
                type="button"
                className={`time-stop ${i === index ? 'active' : i < session.history.length ? 'visited' : ''}`}
                disabled={i > session.history.length}
                aria-current={i === index ? 'step' : undefined}
                onClick={() => dispatch({ type: 'seek', frame: i })}
              >
                <strong>{i <= session.history.length ? item.at.slice(11, 16) : '— — : — —'}</strong>
                <small>
                  <Icon
                    name={
                      i > session.history.length
                        ? 'LockKeyhole'
                        : i < session.history.length
                          ? 'Check'
                          : 'Satellite'
                    }
                  />
                  {i > session.history.length
                    ? 'Pendiente'
                    : i < session.history.length
                      ? 'Revisar'
                      : 'Actual'}
                </small>
              </button>
            ))}
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
              {rows.map((row) => (
                <div className="observation" key={row.symbol}>
                  <span className="observation-icon">
                    <Icon name={row.symbol} />
                  </span>
                  <div>
                    <strong>{row.title}</strong>
                    <small>{row.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="resource-section" aria-labelledby="resources-heading">
            <div className="section-label">
              <h2 id="resources-heading">Recursos disponibles</h2>
              <span className="small-tag muted-tag">EJERCICIO</span>
            </div>
            <div className="resource-grid">
              {(Object.keys(capacity) as ResourceKind[]).map((kind) => (
                <div className="resource" key={kind}>
                  <div className="resource-top">
                    <Icon name={resourceIcons[kind]} />
                    <b>
                      {resources[kind]}
                      <span className="text-slate-500 text-sm">/{capacity[kind]}</span>
                    </b>
                  </div>
                  <small>{resourceLabels[kind]}</small>
                  <div className="resource-meter" aria-hidden="true">
                    {['alpha', 'bravo', 'charlie'].slice(0, capacity[kind]).map((slot, i) => (
                      <i key={`${kind}-${slot}`} className={i < resources[kind] ? 'ready' : ''} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section
            id="decision-panel"
            className="decision-panel"
            tabIndex={-1}
            aria-labelledby="decision-title"
            ref={decisionRef}
          >
            <p className="eyebrow accent">
              {readonly ? 'REVISIÓN · DECISIÓN GUARDADA' : 'TU TURNO'}
            </p>
            <h2 id="decision-title">{stage.title}</h2>
            <p className="decision-description">{stage.prompt}</p>
            <fieldset>
              <legend className="sr-only">Selecciona una acción para esta etapa</legend>
              <div className="choice-list">
                {stage.choices.map((choice) => (
                  <label className="choice" key={choice.id}>
                    <input
                      type="radio"
                      name="decision"
                      value={choice.id}
                      checked={(saved?.choice.id ?? selected) === choice.id}
                      disabled={readonly || !canAfford(choice, resources)}
                      onChange={() => dispatch({ type: 'select', choice: choice.id })}
                    />
                    <span>
                      <strong>{choice.title}</strong>
                      <small>
                        {costLabel(choice)}
                        {!readonly && !canAfford(choice, resources) ? ' · No disponible' : ''}
                      </small>
                    </span>
                  </label>
                ))}
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
