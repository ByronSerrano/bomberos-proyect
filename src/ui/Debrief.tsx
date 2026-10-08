import type { CSSProperties } from 'react';
import {
  capacity,
  type Decision,
  type ResourceKind,
  reservations,
  type Session,
  stageFor,
  trainingScore,
} from '@/domain/replay';
import { costLabel, exportReport, resourceAmount, resourceInfo } from '@/lib/presentation';
import { Icon } from '@/ui/Icon';
import { Term } from '@/ui/Term';

interface Props {
  session: Session;
  onRestart: () => void;
  onReview: () => void;
}
export function Debrief({ session, onRestart, onReview }: Props) {
  const score = trainingScore(session);
  const earned = session.history.reduce((sum, entry) => sum + entry.choice.score, 0);
  const possible = session.frames.length * 25;
  const max = Math.max(...session.frames.map((frame) => frame.observations.length), 1);
  return (
    <>
      <section className="debrief-header">
        <p className="eyebrow">DEBRIEF · {session.dataset.title.toUpperCase()}</p>
        <span className="data-badge">
          <Icon name="Check" /> Ejercicio completado
        </span>
        <h1>La evidencia detrás de tus decisiones.</h1>
        <p>Revisa cómo interpretaste cada lectura y qué información quedó pendiente.</p>
      </section>
      <div className="debrief-grid">
        <section className="score-card">
          <div className="score-ring" style={{ '--score': `${score * 3.6}deg` } as CSSProperties}>
            <div>
              <strong>{score}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <h2>
            {score >= 80
              ? 'Interpretación cuidadosa'
              : score >= 50
                ? 'Hay criterios por reforzar'
                : 'Revisa los límites de los datos'}
          </h2>
          <p>
            Puntuación didáctica sobre interpretación, verificación, planificación y continuidad. No
            mide el resultado de una emergencia real.
          </p>
          <p className="score-formula">
            {earned} puntos de {possible} posibles. El puntaje es el redondeo de ({earned} /{' '}
            {possible}) × 100, que da {score}.
          </p>
          <a href="#rubric" className="text-link">
            Ver la rúbrica <Icon name="ArrowRight" />
          </a>
        </section>
        <section className="evidence-card">
          <p className="eyebrow">EVOLUCIÓN OBSERVADA</p>
          <h2>
            {session.dataset.observations.length} detecciones, {session.frames.length} etapas
          </h2>
          <p>
            Conteo por etapa, no superficie quemada. Cada barra contiene únicamente registros del
            archivo.
          </p>
          <div
            className="bar-chart"
            role="img"
            aria-label={`Detecciones por etapa: ${session.frames.map((frame) => `${frame.at.slice(11, 16)} UTC: ${frame.observations.length}`).join('; ')}`}
          >
            {session.frames.map((frame) => (
              <div className="bar-column" key={frame.at}>
                <strong>{frame.observations.length}</strong>
                <div
                  className="bar"
                  style={{ height: Math.max(8, (frame.observations.length / max) * 135) }}
                />
                <span>{frame.at.slice(11, 16)}</span>
              </div>
            ))}
          </div>
          <p className="form-help">
            <Term id="utc">UTC</Term> · orden por adquisición. Más detecciones no prueba mayor
            propagación.
          </p>
        </section>
      </div>
      <section className="source-card mt-6">
        <div className="section-label">
          <h2>
            <Icon name="Radio" /> Tus decisiones y su razonamiento
          </h2>
          <span className="small-tag muted-tag">RÚBRICA DIDÁCTICA</span>
        </div>
        {session.history.map((entry) => (
          <ReviewEntry key={entry.frame} session={session} entry={entry} />
        ))}
        <div className="resource-summary">
          <p>Uso de recursos por etapa. Las asignaciones no representan despliegues reales.</p>
          <ol className="resource-strip">
            {session.frames.map((frame, index) => {
              const held = reservations(session, index);
              const decision = session.history[index];
              return (
                <li key={frame.at}>
                  <time dateTime={frame.at}>{frame.at.slice(11, 16)} UTC</time>
                  <span>
                    {held.length
                      ? held
                          .map(
                            (item) =>
                              `${resourceAmount(item.kind, item.amount)} vuelve en la etapa ${item.returnsAt + 1}`,
                          )
                          .join(' · ')
                      : 'Sin reservas de etapas anteriores'}
                    {decision ? `. Esta etapa asigna ${costLabel(decision.choice)}.` : ''}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="form-help">
            Cupo del ejercicio:{' '}
            {(Object.keys(capacity) as ResourceKind[])
              .map((kind) => resourceInfo[kind].label)
              .join(' · ')}
            .
          </p>
        </div>
      </section>
      <details className="source-card mt-6" id="rubric" open>
        <summary>Rúbrica de evaluación transparente</summary>
        <p>
          Cada etapa vale 25 puntos. Se favorece documentar límites, contrastar fuentes, planificar
          con incertidumbre y dar continuidad. Las otras opciones reciben el valor fijo que se
          muestra abajo. Es una propuesta pedagógica del proyecto, no un estándar de NASA.
        </p>
        <div className="rubric-grid">
          {session.frames.map((frame, i) => {
            const stage = stageFor(session, i);
            return (
              <div key={frame.at}>
                <h3>{stage.criterion}</h3>
                <ul>
                  {stage.choices.map((choice) => {
                    const chosen = session.history[i]?.choice.id === choice.id;
                    const best = choice.score === 25;
                    return (
                      <li
                        key={choice.id}
                        className={`${chosen ? 'rubric-chosen' : ''} ${best ? 'rubric-best' : ''}`}
                      >
                        {chosen && <span className="small-tag">Elegida</span>}{' '}
                        {best && <span className="small-tag">Mejor</span>} {choice.title}{' '}
                        <b>{choice.score}/25</b>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </details>
      <div className="debrief-actions">
        <button type="button" className="button-primary" onClick={onRestart}>
          <Icon name="RotateCcw" /> Repetir el ejercicio
        </button>
        <button type="button" className="button-secondary" onClick={() => exportReport(session)}>
          <Icon name="Download" /> Exportar debrief JSON
        </button>
        <button type="button" className="button-secondary" onClick={onReview}>
          <Icon name="MapPin" /> Revisar mapa completo
        </button>
      </div>
    </>
  );
}

function ReviewEntry({ session, entry }: { session: Session; entry: Decision }) {
  const stage = stageFor(session, entry.frame);
  const best = stage.choices.find((choice) => choice.score === 25);
  return (
    <article className="review-row">
      <time dateTime={entry.at}>{entry.at.slice(11, 16)} UTC</time>
      <div>
        <span className="eyebrow">{stage.criterion}</span>
        <h3>{entry.choice.title}</h3>
        <p>{entry.choice.feedback}</p>
        {entry.choice.score < 25 && best && (
          <p className="review-alternative">
            La opción con 25 era {best.title}. {best.feedback}
          </p>
        )}
        {entry.note && <blockquote>Tu razonamiento: {entry.note}</blockquote>}
      </div>
      <span className="review-score">
        {entry.choice.score}
        <small>/ 25</small>
      </span>
    </article>
  );
}
