import { type FormEvent, useEffect, useRef, useState } from 'react';
import { loadSample, requestJson } from '@/data/client';
import {
  bboxSchema,
  type Dataset,
  datasetSchema,
  eonetResponseSchema,
  firmsQuerySchema,
  firmsSourceLabels,
  type NaturalEvent,
} from '@/domain/models';
import { errorMessage, eventLocation } from '@/lib/presentation';
import { BboxPicker } from '@/ui/BboxPicker';
import { Icon } from '@/ui/Icon';
import { Term } from '@/ui/Term';

interface Props {
  dataset: Dataset;
  onDataset: (dataset: Dataset, message?: string) => void;
  onBack: () => void;
}
type FieldName = 'bbox' | 'date' | 'days' | 'source';
export function Sources({ dataset, onDataset, onBack }: Props) {
  const [bbox, setBbox] = useState(() => dataset.bbox.join(','));
  const [date, setDate] = useState(() =>
    new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
  );
  const [days, setDays] = useState('3');
  const [source, setSource] = useState('VIIRS_NOAA20_NRT');
  const [health, setHealth] = useState('Comprobando servidor local…');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<NaturalEvent[]>([]);
  const [eventStatus, setEventStatus] = useState(
    'Consulta el catálogo para explorar eventos reales. El caso local funciona sin conexión.',
  );
  const [eventsBusy, setEventsBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const pending = useRef<AbortController | null>(null);
  const pendingEvents = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    requestJson('/api/health', { signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted)
          setHealth(
            body &&
              typeof body === 'object' &&
              'firmsConfigured' in body &&
              body.firmsConfigured === true
              ? 'FIRMS configurado · la clave permanece en el servidor local.'
              : 'Falta FIRMS_MAP_KEY en .env. El caso reproducible y EONET no necesitan clave.',
          );
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setHealth(errorMessage(error));
      });
    return () => {
      controller.abort();
      pending.current?.abort();
      pendingEvents.current?.abort();
    };
  }, []);
  useEffect(() => {
    function revealLayers() {
      if (window.location.hash !== '#capas') return;
      document.getElementById('capas')?.scrollIntoView({ block: 'start' });
    }
    revealLayers();
    window.addEventListener('hashchange', revealLayers);
    return () => window.removeEventListener('hashchange', revealLayers);
  }, []);
  async function startDataset(sample: boolean) {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setStatus(
      sample ? 'Cargando el caso reproducible…' : 'Consultando observaciones reales en NASA FIRMS…',
    );
    try {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]);
      const next = sample
        ? await loadSample(signal)
        : datasetSchema.parse(
            await requestJson('/api/firms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal,
              body: JSON.stringify(
                firmsQuerySchema.parse({
                  bbox: bbox.split(',').map(Number),
                  date,
                  days: Number(days),
                  source,
                }),
              ),
            }),
          );
      if (!controller.signal.aborted)
        onDataset(next, sample ? undefined : `Nuevo replay cargado: ${next.subtitle}`);
    } catch (error) {
      if (!controller.signal.aborted) setStatus(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      pending.current = null;
    }
  }
  function issue(error: { issues: { message: string }[] }, fallback: string): string {
    return error.issues[0]?.message ?? fallback;
  }
  function validate(): boolean {
    const next: Partial<Record<FieldName, string>> = {};
    const area = bboxSchema.safeParse(bbox.split(',').map((part) => Number(part.trim())));
    if (!area.success) next.bbox = issue(area.error, 'Revisa el área.');
    const when = firmsQuerySchema.shape.date.safeParse(date);
    if (!when.success) next.date = issue(when.error, 'Revisa la fecha.');
    const span = firmsQuerySchema.shape.days.safeParse(Number(days));
    if (!span.success) next.days = issue(span.error, 'Revisa los días.');
    const product = firmsQuerySchema.shape.source.safeParse(source);
    if (!product.success) next.source = issue(product.error, 'Revisa el producto.');
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    void startDataset(false);
  }
  async function fetchEvents() {
    if (pendingEvents.current) return;
    const controller = new AbortController();
    pendingEvents.current = controller;
    setEventsBusy(true);
    setEventStatus('Consultando NASA EONET…');
    try {
      const response = eonetResponseSchema.parse(
        await requestJson('/api/events', {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
        }),
      );
      if (!controller.signal.aborted) {
        setEvents(response.events);
        setEventStatus(
          response.events.length
            ? `${response.events.length} eventos recibidos de EONET.`
            : 'EONET no devolvió eventos para esta consulta.',
        );
      }
    } catch (error) {
      if (!controller.signal.aborted) setEventStatus(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) setEventsBusy(false);
      pendingEvents.current = null;
    }
  }
  function selectEvent(event: NaturalEvent) {
    const point = eventLocation(event);
    if (!point) return;
    setBbox(
      [
        Math.max(-180, point.lon - 0.4),
        Math.max(-90, point.lat - 0.4),
        Math.min(180, point.lon + 0.4),
        Math.min(90, point.lat + 0.4),
      ]
        .map((value) => value.toFixed(3))
        .join(','),
    );
    setDate(point.date);
    setStatus(
      `Sector de ${event.title} seleccionado. Revisa la fecha y la disponibilidad del producto antes de consultar.`,
    );
    formRef.current?.querySelector('input')?.focus();
  }
  return (
    <>
      <section className="intro-row">
        <div>
          <p className="eyebrow">EVIDENCIA Y PROCEDENCIA</p>
          <h1>Conoce los datos detrás del replay.</h1>
          <p className="intro-description">
            Un caso reproducible y consultas directas a servicios oficiales de NASA.
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={onBack}>
          <Icon name="ChevronLeft" /> Volver al ejercicio
        </button>
      </section>
      <div className="sources-grid">
        <section className="source-card">
          <div className="section-label">
            <h2>
              <Icon name="Database" /> Dataset del ejercicio actual
            </h2>
            <span className="small-tag">REAL</span>
          </div>
          <h3>{dataset.title}</h3>
          <p>{dataset.subtitle}</p>
          <dl className="provenance">
            <div>
              <dt>Observaciones del sector</dt>
              <dd>{dataset.observations.length}</dd>
            </div>
            <div>
              <dt>Filas en la fuente completa</dt>
              <dd>{dataset.sourceRows.toLocaleString('es')}</dd>
            </div>
            <div>
              <dt>Filas inválidas / duplicadas</dt>
              <dd>
                {dataset.rejectedRows} / {dataset.duplicatesRemoved}
              </dd>
            </div>
            <div>
              <dt>Descargado</dt>
              <dd>{dataset.retrievedAt.replace('T', ' ').slice(0, 19)} UTC</dd>
            </div>
            <div>
              <dt>Área oeste, sur, este, norte</dt>
              <dd>{dataset.bbox.join(', ')}</dd>
            </div>
          </dl>
          <details>
            <summary>Huella SHA-256 del CSV original</summary>
            <code className="hash">{dataset.sourceSha256}</code>
          </details>
          <div className="flex flex-wrap gap-3 mt-5">
            <a className="text-link" href={dataset.sourceUrl} target="_blank" rel="noreferrer">
              Fuente original <Icon name="ExternalLink" />
            </a>
            <a
              className="text-link"
              href={dataset.documentationUrl}
              target="_blank"
              rel="noreferrer"
            >
              Documentación NASA <Icon name="ExternalLink" />
            </a>
          </div>
          <button
            type="button"
            className="button-secondary mt-5"
            disabled={busy}
            onClick={() => void startDataset(true)}
          >
            <Icon name="RotateCcw" /> Cargar el caso reproducible
          </button>
          <p className="source-caption">
            La selección inicial es un sector geográfico de Columbia Británica. No se atribuyen
            todas sus detecciones a un único incendio.
          </p>
        </section>
        <section className="source-card">
          <div className="section-label">
            <h2>
              <Icon name="Satellite" /> Consultar NASA FIRMS
            </h2>
            <span className="small-tag muted-tag">API</span>
          </div>
          <p>Selecciona un área y fechas para construir un nuevo replay con observaciones VIIRS.</p>
          <div className="form-help" role="status">
            {health}
          </div>
          <form ref={formRef} onSubmit={submit} aria-label="Consulta NASA FIRMS" aria-busy={busy}>
            <fieldset disabled={busy}>
              <label>
                Área oeste, sur, este, norte
                <input
                  id="firms-bbox"
                  name="bbox"
                  required
                  value={bbox}
                  onChange={(event) => setBbox(event.target.value)}
                  autoComplete="off"
                  aria-invalid={Boolean(fieldErrors.bbox)}
                  aria-describedby={fieldErrors.bbox ? 'bbox-help bbox-error' : 'bbox-help'}
                />
              </label>
              <p id="bbox-help" className="form-help">
                Área del ejercicio actual. Máximo 10° por lado. No equivale a un límite
                administrativo.
              </p>
              {fieldErrors.bbox && (
                <p id="bbox-error" className="field-error">
                  {fieldErrors.bbox}
                </p>
              )}
              <BboxPicker value={bbox} onChange={setBbox} />
              <div className="form-row">
                <label>
                  Fecha inicial UTC
                  <input
                    id="firms-date"
                    type="date"
                    name="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    required
                    aria-invalid={Boolean(fieldErrors.date)}
                    aria-describedby={fieldErrors.date ? 'date-error' : undefined}
                  />
                </label>
                <label>
                  Días
                  <select
                    id="firms-days"
                    name="days"
                    value={days}
                    onChange={(event) => setDays(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.days)}
                    aria-describedby={fieldErrors.days ? 'days-error' : undefined}
                  >
                    {[1, 2, 3, 4, 5].map((day) => (
                      <option key={day} value={day}>
                        {day} día{day > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {fieldErrors.date && (
                <p id="date-error" className="field-error">
                  {fieldErrors.date}
                </p>
              )}
              {fieldErrors.days && (
                <p id="days-error" className="field-error">
                  {fieldErrors.days}
                </p>
              )}
              <label>
                Producto
                <select
                  id="firms-source"
                  name="source"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.source)}
                  aria-describedby={fieldErrors.source ? 'source-help source-error' : 'source-help'}
                >
                  {Object.entries(firmsSourceLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <p id="source-help" className="form-help">
                <Term id="nrt">NRT</Term> cubre datos recientes; <Term id="sp">SP</Term> es el
                archivo de procesamiento estándar. <Term id="utc">UTC</Term> es la hora de la
                consulta.{' '}
                <a
                  href="https://firms.modaps.eosdis.nasa.gov/api/data_availability/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Consulta las fechas disponibles.
                </a>
              </p>
              {fieldErrors.source && (
                <p id="source-error" className="field-error">
                  {fieldErrors.source}
                </p>
              )}
              <button className="button-primary" type="submit">
                <Icon name="Download" />
                {busy ? 'Consultando…' : 'Consultar y comenzar nuevo replay'}
              </button>
            </fieldset>
            <p className="form-status" role="status" aria-live="polite">
              {status}
            </p>
            <p className="source-caption">
              Un nuevo replay reemplaza el ejercicio actual. Una consulta vacía o fallida conserva
              tu sesión.
            </p>
          </form>
        </section>
        <section className="source-card source-wide" id="capas" tabIndex={-1}>
          <div className="section-label">
            <h2>
              <Icon name="BookOpen" /> Qué significa cada capa
            </h2>
          </div>
          <div className="method-grid">
            <div>
              <h3>Detecciones, no perímetros</h3>
              <p>
                Un punto <Term id="viirs">VIIRS</Term> indica una anomalía térmica dentro de una{' '}
                <Term id="huella">huella</Term> del sensor. Los conteos, la{' '}
                <Term id="confianza">confianza</Term> y la <Term id="frp">FRP</Term> no determinan
                por sí solos área quemada, velocidad de propagación o peligro para una población.
              </p>
              <a
                className="text-link"
                href="https://www.earthdata.nasa.gov/data/tools/firms/faq"
                target="_blank"
                rel="noreferrer"
              >
                FIRMS FAQ <Icon name="ExternalLink" />
              </a>
            </div>
            <div>
              <h3>El reloj es de adquisición</h3>
              <p>
                La secuencia usa la hora <Term id="utc">UTC</Term> registrada por el satélite. La
                fuente no incluye la hora exacta en que cada observación se hizo pública. Los saltos
                entre lecturas no se interpolan.
              </p>
            </div>
            <div>
              <h3>La parte didáctica</h3>
              <p>
                Recursos, opciones y puntuación pertenecen al ejercicio. No se simulan extinción,
                evacuados ni víctimas. La rúbrica no es un protocolo validado de respuesta a
                emergencias.
              </p>
            </div>
            <div>
              <h3>Fondos geográficos</h3>
              <p>
                NASA <Term id="gibs">GIBS</Term> Blue Marble es una referencia estática, no una
                imagen del incendio de esa fecha. Los fondos necesitan internet.
              </p>
              <a
                className="text-link"
                href="https://nasa-gibs.github.io/gibs-api-docs/"
                target="_blank"
                rel="noreferrer"
              >
                NASA GIBS <Icon name="ExternalLink" />
              </a>
            </div>
          </div>
        </section>
        <section className="source-card source-wide">
          <div className="section-label">
            <h2>
              <Icon name="Activity" /> Catálogo de eventos <Term id="eonet">EONET</Term>
            </h2>
            <button
              type="button"
              className="button-secondary"
              disabled={eventsBusy}
              onClick={() => void fetchEvents()}
            >
              <Icon name="RotateCcw" />
              {eventsBusy ? 'Consultando…' : 'Consultar catálogo'}
            </button>
          </div>
          <p>
            Eventos registrados por EONET. Elegir uno completa el área y la fecha de la consulta,
            sin atribuir automáticamente los puntos FIRMS a ese evento.
          </p>
          <p className="form-help" role="status">
            {eventStatus}
          </p>
          <div className="events-list">
            {events.map((event) => {
              const point = eventLocation(event);
              return (
                <article className="event-card" key={event.id}>
                  <span className="eyebrow">{event.id}</span>
                  <h3>{event.title}</h3>
                  <p>{point?.date ?? 'Sin punto disponible'} · EONET</p>
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={!point || busy}
                    onClick={() => selectEvent(event)}
                  >
                    Usar sector <Icon name="ArrowRight" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
