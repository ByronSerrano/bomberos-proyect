import { type ReactNode, type ToggleEvent, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { type GlossaryId, glossary } from '@/lib/glossary';

const edge = 8;
const gap = 6;

function placePopover(anchor: HTMLElement, popover: HTMLElement) {
  const anchorRect = anchor.getBoundingClientRect();
  const popRect = popover.getBoundingClientRect();
  const width = Math.min(popRect.width, window.innerWidth - edge * 2);
  let left = anchorRect.left;
  if (left + width > window.innerWidth - edge) left = window.innerWidth - edge - width;
  if (left < edge) left = edge;
  const below = anchorRect.bottom + gap;
  const above = anchorRect.top - gap - popRect.height;
  const fitsBelow = below + popRect.height <= window.innerHeight - edge;
  const top = fitsBelow ? below : Math.max(edge, above);
  popover.style.right = 'auto';
  popover.style.bottom = 'auto';
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

export function Term({ id, children }: { id: GlossaryId; children: ReactNode }) {
  const popoverId = `term-${id}-${useId().replace(/:/g, '')}`;
  const entry = glossary[id];
  const buttonRef = useRef<HTMLButtonElement>(null);
  const stopTracking = useRef<(() => void) | null>(null);
  useEffect(() => () => stopTracking.current?.(), []);

  function track(event: ToggleEvent<HTMLSpanElement>) {
    stopTracking.current?.();
    stopTracking.current = null;
    if (event.newState !== 'open') return;
    const popover = event.currentTarget;
    const update = () => {
      const button = buttonRef.current;
      if (button) placePopover(button, popover);
    };
    update();
    requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    stopTracking.current = () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }

  return (
    <>
      <button ref={buttonRef} type="button" className="term" popoverTarget={popoverId}>
        {children}
      </button>
      {createPortal(
        <span id={popoverId} popover="auto" className="term-popover" onToggle={track}>
          <strong>{entry.title}</strong>
          <p>{entry.body}</p>
          <button
            type="button"
            className="term-more"
            onClick={() => {
              window.dispatchEvent(new Event('disaster-replay:layers'));
            }}
          >
            Qué significa cada capa
          </button>
        </span>,
        document.body,
      )}
    </>
  );
}
