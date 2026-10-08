import { useEffect, useReducer, useState } from 'react';
import { loadSample } from '@/data/client';
import { initialWorkspace, prepareSession, workspaceReducer } from '@/domain/workspace';
import { errorMessage } from '@/lib/presentation';
import { Debrief } from '@/ui/Debrief';
import { Layout } from '@/ui/Layout';
import { Sources } from '@/ui/Sources';
import { Workspace } from '@/ui/Workspace';

export function App() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [attempt, setAttempt] = useState(0);
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
    <Layout
      view={state.view}
      ready={!!session}
      onNavigate={(view) => dispatch({ type: 'navigate', view })}
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
          onDataset={(dataset) => dispatch({ type: 'load', session: prepareSession(dataset) })}
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
  );
}
