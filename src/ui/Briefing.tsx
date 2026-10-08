import { useEffect, useRef } from 'react';
import type { ResourceKind } from '@/domain/replay';
import { capacity } from '@/domain/replay';
import { resourceInfo } from '@/lib/presentation';

export const briefingStorageKey = 'disaster-replay:briefing-seen';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenLayers: () => void;
}
export function Briefing({ open, onClose, onOpenLayers }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={dialogRef} className="briefing" aria-labelledby="briefing-title" onClose={onClose}>
      <p className="eyebrow">ANTES DE EMPEZAR</p>
      <h2 id="briefing-title">Cómo funciona el ejercicio</h2>
      <div className="briefing-grid">
        <section>
          <h3>Objetivo</h3>
          <p>
            Practicar cómo se lee evidencia satelital durante un incendio. Cada etapa muestra
            detecciones reales de NASA y pide una decisión de ejercicio.
          </p>
        </section>
        <section>
          <h3>Mecánica</h3>
          <p>
            Hay hasta cuatro lecturas. Confirmas una acción por etapa. Puedes volver a ver las
            anteriores, pero no reescribirlas. Lo que elijas no mueve los puntos del mapa.
          </p>
        </section>
        <section>
          <h3>Recursos</h3>
          <ul>
            {(Object.keys(resourceInfo) as ResourceKind[]).map((kind) => (
              <li key={kind}>
                <strong>
                  {capacity[kind]} {resourceInfo[kind].label}.
                </strong>{' '}
                {resourceInfo[kind].description}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Lo que el ejercicio no hace</h3>
          <p>
            No simula propagación, extinción, evacuados ni víctimas. No incluye viento, población,
            rutas ni una hora de publicación. La rúbrica es didáctica, no un protocolo de despacho.
          </p>
        </section>
      </div>
      <div className="briefing-actions">
        <button type="button" className="button-primary" onClick={() => dialogRef.current?.close()}>
          Entendido
        </button>
        <button type="button" className="button-secondary" onClick={onOpenLayers}>
          Qué significa cada capa
        </button>
      </div>
    </dialog>
  );
}
