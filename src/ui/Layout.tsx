import type { ReactNode } from 'react';
import type { View } from '@/domain/workspace';
import { Icon, type IconName } from '@/ui/Icon';
import type { Theme } from '@/ui/theme';

interface Props {
  view: View;
  ready: boolean;
  completed: boolean;
  theme: Theme;
  onNavigate: (view: View) => void;
  onBriefing: () => void;
  onToggleTheme: () => void;
  children: ReactNode;
}
const tabs: { view: View; label: string; icon: IconName }[] = [
  { view: 'workspace', label: 'Sala de mando', icon: 'Compass' },
  { view: 'sources', label: 'Fuentes y datos', icon: 'Database' },
];
export function Layout({
  view,
  ready,
  completed,
  theme,
  onNavigate,
  onBriefing,
  onToggleTheme,
  children,
}: Props) {
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
            disaster<span className="brand-rest">replay</span>
            <small>OBSERVAR. DECIDIR. APRENDER.</small>
          </span>
        </a>
        <nav aria-label="Secciones">
          <button type="button" className="nav-tab briefing-tab" onClick={onBriefing}>
            <Icon name="BookOpen" /> <span className="max-[540px]:sr-only">Cómo funciona</span>
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.view}
              type="button"
              className={`nav-tab ${view === tab.view ? 'active' : ''}`}
              aria-current={view === tab.view ? 'page' : undefined}
              disabled={!ready}
              onClick={() => onNavigate(tab.view)}
            >
              <Icon name={tab.icon} /> {tab.label}
            </button>
          ))}
          {completed && (
            <button
              type="button"
              className={`nav-tab ${view === 'debrief' ? 'active' : ''}`}
              aria-current={view === 'debrief' ? 'page' : undefined}
              disabled={!ready}
              onClick={() => onNavigate('debrief')}
            >
              <Icon name="Check" /> Debrief
            </button>
          )}
        </nav>
        <div className="topbar-tools">
          <button
            type="button"
            className="theme-switch"
            aria-pressed={theme === 'dark'}
            onClick={onToggleTheme}
          >
            <Icon name={theme === 'dark' ? 'Moon' : 'Sun'} />
            <span className="max-[540px]:sr-only">
              {theme === 'dark' ? 'Tema oscuro' : 'Tema claro'}
            </span>
          </button>
          <span className="local-tag">
            <i /> ENTORNO LOCAL
          </span>
        </div>
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
