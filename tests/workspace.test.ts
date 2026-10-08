import { describe, expect, test } from 'bun:test';
import { datasetSchema } from '@/domain/models';
import { initialWorkspace, prepareSession, workspaceReducer } from '@/domain/workspace';

const dataset = datasetSchema.parse(await Bun.file('public/data/bc-2023-07-12.json').json());
const initial = () =>
  workspaceReducer(initialWorkspace, { type: 'load', session: prepareSession(dataset) });
describe('React workspace state (pure TS)', () => {
  test('navigation retains controlled selection and note', () => {
    let state = workspaceReducer(initial(), { type: 'select', choice: 'interpret-detections' });
    state = workspaceReducer(state, { type: 'note', value: 'Verificar coordenadas.' });
    state = workspaceReducer(state, { type: 'navigate', view: 'sources' });
    state = workspaceReducer(state, { type: 'navigate', view: 'workspace' });
    expect(state.selected).toBe('interpret-detections');
    expect(state.note).toBe('Verificar coordenadas.');
  });
  test('duplicate UI events cannot spend resources twice or advance twice', () => {
    let state = workspaceReducer(initial(), { type: 'select', choice: 'interpret-detections' });
    state = workspaceReducer(state, { type: 'confirm', frame: 0 });
    const repeated = workspaceReducer(state, { type: 'confirm', frame: 0 });
    expect(repeated).toBe(state);
    expect(state.session?.history).toHaveLength(1);
    expect(state.selected).toBeNull();
    expect(state.frame).toBe(1);
  });
  test('future seeks and unknown choices cannot change state', () => {
    const state = initial();
    expect(workspaceReducer(state, { type: 'seek', frame: 3 })).toBe(state);
    expect(workspaceReducer(state, { type: 'seek', frame: -1 })).toBe(state);
    expect(workspaceReducer(state, { type: 'seek', frame: Number.NaN })).toBe(state);
    expect(workspaceReducer(state, { type: 'review' })).toBe(state);
    expect(workspaceReducer(state, { type: 'navigate', view: 'debrief' })).toBe(state);
    expect(workspaceReducer(state, { type: 'select', choice: 'invented' })).toBe(state);
  });
  test('empty input fails before replacing the current session', () => {
    expect(() => prepareSession({ ...dataset, observations: [] })).toThrow(
      'Se conserva el ejercicio actual',
    );
  });
  test('notes have a bound and restarting clears decisions without altering observations', () => {
    let state = workspaceReducer(initial(), { type: 'note', value: 'a'.repeat(600) });
    expect(state.note).toHaveLength(500);
    state = workspaceReducer(state, { type: 'select', choice: 'interpret-detections' });
    state = workspaceReducer(state, { type: 'confirm', frame: 0 });
    state = workspaceReducer(state, { type: 'restart' });
    expect(state.session?.history).toHaveLength(0);
    expect(state.note).toBe('');
    expect(state.session?.dataset).toBe(dataset);
  });
});
