import type { CSSProperties } from 'react';
import {
  availableResources,
  capacity,
  type Session,
  stageFor,
  trainingScore,
} from '@/domain/replay';
import { exportReport } from '@/lib/presentation';
import { Icon } from '@/ui/Icon';

interface Props {
  session: Session;
  onRestart: () => void;
  onReview: () => void;
}
export function Debrief({ session, onRestart, onReview }: Props) {
  const score = trainingScore(session);
  const max = Math.max(...session.frames.map((frame) => frame.observations.length), 1);
  const resources = availableResources(session);
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
            UTC · orden por adquisición. Más detecciones no prueba mayor propagación.
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
          <article className="review-row" key={entry.frame}>
            <time dateTime={entry.at}>{entry.at.slice(11, 16)} UTC</time>
            <div>
              <span className="eyebrow">{stageFor(session, entry.frame).criterion}</span>
              <h3>{entry.choice.title}</h3>
              <p>{entry.choice.feedback}</p>
              {entry.note && <blockquote>Tu razonamiento: {entry.note}</blockquote>}
            </div>
            <span className="review-score">
              {entry.choice.score}
              <small>/ 25</small>
            </span>
          </article>
        ))}
        <div className="resource-summary">
          Capacidad libre al cierre del ejercicio: {resources.field}/{capacity.field} equipos ·{' '}
          {resources.logistics}/{capacity.logistics} apoyos logísticos · {resources.analysis}/
          {capacity.analysis} analistas. Las asignaciones pendientes no representan despliegues
          reales.
        </div>
      </section>
      <details className="source-card mt-6" id="rubric">
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
                  {stage.choices.map((choice) => (
                    <li key={choice.id}>
                      {choice.title} <b>{choice.score}/25</b>
                    </li>
                  ))}
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
