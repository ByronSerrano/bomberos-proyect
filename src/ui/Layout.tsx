import type { ReactNode } from 'react';
import type { View } from '@/domain/workspace';
import { Icon } from '@/ui/Icon';

interface Props {
  view: View;
  ready: boolean;
  onNavigate: (view: View) => void;
  children: ReactNode;
}
export function Layout({ view, ready, onNavigate, children }: Props) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Disaster Replay, inicio">
          <span className="brand-symbol">
            <Icon name="Flame" />
          </span>
          <span>
            disaster<span className="font-normal text-slate-400">replay</span>
            <small>OBSERVAR. DECIDIR. APRENDER.</small>
          </span>
        </a>
        <nav aria-label="Secciones">
          <button
            type="button"
            className={`nav-tab ${view !== 'sources' ? 'active' : ''}`}
            aria-current={view !== 'sources' ? 'page' : undefined}
            disabled={!ready}
            onClick={() => onNavigate('workspace')}
          >
            <Icon name="Compass" /> Sala de mando
          </button>
          <button
            type="button"
            className={`nav-tab ${view === 'sources' ? 'active' : ''}`}
            aria-current={view === 'sources' ? 'page' : undefined}
            disabled={!ready}
            onClick={() => onNavigate('sources')}
          >
            <Icon name="Database" /> Fuentes y datos
          </button>
        </nav>
        <span className="local-tag">
          <i /> ENTORNO LOCAL
        </span>
      </header>
      <main id="main-content" className="page-wrap" tabIndex={-1}>
        {children}
      </main>
      <footer className="page-footer">
        <span>NASA FIRMS · EONET · GIBS</span>
        <span>Observaciones reales · recursos y evaluación didácticos</span>
        <span>Disaster Replay / v0.2</span>
      </footer>
    </>
  );
}
