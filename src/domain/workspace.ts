import type { Dataset } from '@/domain/models';
import {
  availableResources,
  canAfford,
  commitDecision,
  createSession,
  type Session,
  stageFor,
} from '@/domain/replay';

export type View = 'workspace' | 'sources' | 'debrief';
export interface WorkspaceState {
  session: Session | null;
  view: View;
  frame: number;
  selected: string | null;
  note: string;
  error: string | null;
}
export const initialWorkspace: WorkspaceState = {
  session: null,
  view: 'workspace',
  frame: 0,
  selected: null,
  note: '',
  error: null,
};
export type WorkspaceAction =
  | { type: 'load'; session: Session }
  | { type: 'navigate'; view: View }
  | { type: 'seek'; frame: number }
  | { type: 'select'; choice: string }
  | { type: 'note'; value: string }
  | { type: 'confirm'; frame: number }
  | { type: 'restart' }
  | { type: 'review' }
  | { type: 'error'; message: string };

export function prepareSession(dataset: Dataset): Session {
  const session = createSession(dataset);
  if (!session.frames.length)
    throw new Error(
      'NASA no devolvió detecciones para esta zona y fechas. Se conserva el ejercicio actual.',
    );
  return session;
}
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  const session = state.session;
  switch (action.type) {
    case 'load':
      return { ...initialWorkspace, session: action.session };
    case 'error':
      return { ...state, error: action.message };
    case 'navigate':
      if (
        action.view === 'debrief' &&
        (!session || session.history.length !== session.frames.length)
      )
        return state;
      return { ...state, view: action.view };
    case 'restart':
      return session ? { ...initialWorkspace, session: createSession(session.dataset) } : state;
    case 'review':
      return session && session.history.length === session.frames.length
        ? {
            ...state,
            view: 'workspace',
            frame: session.frames.length - 1,
            selected: null,
            note: '',
          }
        : state;
    case 'seek':
      if (
        !session ||
        !Number.isInteger(action.frame) ||
        action.frame < 0 ||
        action.frame >= session.frames.length ||
        action.frame > session.history.length
      )
        return state;
      return { ...state, frame: action.frame, selected: null, note: '' };
    case 'select': {
      if (!session || state.frame !== session.history.length) return state;
      const choice = stageFor(session, state.frame).choices.find((c) => c.id === action.choice);
      return choice && canAfford(choice, availableResources(session))
        ? { ...state, selected: action.choice }
        : state;
    }
    case 'note':
      return { ...state, note: action.value.slice(0, 500) };
    case 'confirm':
      if (!session || action.frame !== state.frame) return state;
      if (session.history.length === session.frames.length) return { ...state, view: 'debrief' };
      if (state.frame < session.history.length)
        return { ...state, frame: session.history.length, selected: null, note: '' };
      if (!state.selected) return state;
      try {
        const next = commitDecision(session, state.frame, state.selected, state.note);
        const complete = next.history.length === next.frames.length;
        return {
          ...state,
          session: next,
          frame: complete ? next.frames.length - 1 : next.history.length,
          view: complete ? 'debrief' : 'workspace',
          selected: null,
          note: '',
          error: null,
        };
      } catch (error) {
        return {
          ...state,
          error: error instanceof Error ? error.message : 'No se pudo registrar la decisión.',
        };
      }
  }
}
