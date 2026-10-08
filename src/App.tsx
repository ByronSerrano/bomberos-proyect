import { useEffect, useReducer, useState } from 'react';
import { loadSample } from '@/data/client';
import { initialWorkspace, prepareSession, workspaceReducer } from '@/domain/workspace';
import { errorMessage } from '@/lib/presentation';
import { Briefing, briefingStorageKey } from '@/ui/Briefing';
import { Debrief } from '@/ui/Debrief';
import { Layout } from '@/ui/Layout';
import { Sources } from '@/ui/Sources';
import { Workspace } from '@/ui/Workspace';

export function App() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [attempt, setAttempt] = useState(0);
  const [briefingOpen, setBriefingOpen] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(briefingStorageKey) !== '1') setBriefingOpen(true);
    } catch {
      setBriefingOpen(true);
    }
  }, []);
  useEffect(() => {
    function openLayers() {
      window.location.hash = 'capas';
      dispatch({ type: 'navigate', view: 'sources' });
    }
    window.addEventListener('disaster-replay:layers', openLayers);
    return () => window.removeEventListener('disaster-replay:layers', openLayers);
  }, []);
  function dismissBriefing() {
    try {
      localStorage.setItem(briefingStorageKey, '1');
    } catch {
      // Si el almacenamiento está bloqueado, el botón Cómo funciona sigue abriendo el diálogo.
    }
    setBriefingOpen(false);
  }
  useEffect(() => {
    // Changing the attempt counter explicitly retries the initial request.
    void attempt;
    const controller = new AbortController();
    loadSample(controller.signal)
      .then((dataset) => {
        if (!controller.signal.aborted)
          dispatch({ type: 'load', session: prepareSession(dataset) });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) dispatch({ type: 'error', message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [attempt]);
  const session = state.session;
  const completed = !!session && session.history.length === session.frames.length;
  return (
    <>
      <Layout
        view={state.view}
        ready={!!session}
        completed={completed}
        onNavigate={(view) => dispatch({ type: 'navigate', view })}
        onBriefing={() => setBriefingOpen(true)}
      >
        {state.error && (
          <div className="notice" role="alert">
            {state.error}
            {!session && (
              <button
                type="button"
                className="button-secondary"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Reintentar
              </button>
            )}
          </div>
        )}
        {!session && !state.error && (
          <section className="loading-state" role="status">
            <p className="eyebrow">NASA FIRMS · CASO REPRODUCIBLE</p>
            <h1>Preparando el replay.</h1>
            <p>Cargando las observaciones satelitales…</p>
          </section>
        )}
        {session && state.view === 'workspace' && <Workspace state={state} dispatch={dispatch} />}
        {session && state.view === 'sources' && (
          <Sources
            dataset={session.dataset}
            onBack={() => dispatch({ type: 'navigate', view: 'workspace' })}
            onDataset={(dataset, message) => {
              const next = prepareSession(dataset);
              dispatch(
                message
                  ? { type: 'load', session: next, message }
                  : { type: 'load', session: next },
              );
            }}
          />
        )}
        {session && state.view === 'debrief' && completed && (
          <Debrief
            session={session}
            onRestart={() => dispatch({ type: 'restart' })}
            onReview={() => dispatch({ type: 'review' })}
          />
        )}
      </Layout>
      <Briefing
        open={briefingOpen}
        onClose={dismissBriefing}
        onOpenLayers={() => {
          dismissBriefing();
          window.location.hash = 'capas';
          dispatch({ type: 'navigate', view: 'sources' });
        }}
      />
    </>
  );
}
