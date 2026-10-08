import { describe, expect, test } from 'bun:test';
import { type Dataset, datasetSchema } from '@/domain/models';
import {
  availableResources,
  canAfford,
  capacity,
  commitDecision,
  createSession,
  reservations,
  type Session,
  shortfall,
  stageFor,
  trainingScore,
  visibleObservations,
} from '@/domain/replay';

const dataset: Dataset = datasetSchema.parse(
  await Bun.file('public/data/bc-2023-07-12.json').json(),
);
describe('replay state transitions', () => {
  test('no future observation is visible before its stage is reached', () => {
    let session = createSession(dataset);
    expect(visibleObservations(session, 0)).toHaveLength(23);
    expect(visibleObservations(session, 1)).toHaveLength(0);
    session = commitDecision(session, 0, 'interpret-detections');
    expect(visibleObservations(session, 1)).toHaveLength(24);
    expect(visibleObservations(session, 2)).toHaveLength(0);
    expect(visibleObservations(session, 0)).toHaveLength(23);
  });
  test('prevents duplicate decisions, rewriting history, and skipped stages', () => {
    const initial = createSession(dataset);
    const next = commitDecision(initial, 0, 'interpret-detections');
    expect(initial.history).toHaveLength(0);
    expect(() => commitDecision(next, 0, 'interpret-wait')).toThrow();
    expect(() => commitDecision(next, 2, 'prepare-contingency')).toThrow();
    expect(() => commitDecision(next, 1, 'interpret-detections')).toThrow();
  });
  test('reservations last across stages, release, and block unaffordable assignments', () => {
    let session = commitDecision(createSession(dataset), 0, 'interpret-detections');
    expect(availableResources(session).analysis).toBe(1);
    session = commitDecision(session, 1, 'verify-field');
    expect(availableResources(session).analysis).toBe(2);
    expect(availableResources(session).field).toBe(2);
    expect(() => commitDecision(session, 2, 'prepare-all')).toThrow();
    session = commitDecision(session, 2, 'prepare-contingency');
    expect(availableResources(session)).toEqual({ field: 2, logistics: 1, analysis: 2 });
  });
  test('reservations and shortfall explain what is held and what is missing', () => {
    const session = commitDecision(createSession(dataset), 0, 'interpret-detections');
    expect(reservations(session, 1)).toEqual([{ kind: 'analysis', amount: 1, returnsAt: 2 }]);
    expect(reservations(session, 2)).toEqual([]);
    const held = commitDecision(session, 1, 'verify-field');
    const blocked = stageFor(held, 2).choices.find((choice) => choice.id === 'prepare-all');
    if (!blocked) throw new Error('Falta la opción.');
    expect(shortfall(blocked, availableResources(held))).toEqual([
      { kind: 'field', need: 3, have: 2 },
    ]);
    const open = stageFor(held, 2).choices[0];
    if (!open) throw new Error('Falta la opción.');
    expect(shortfall(open, availableResources(held))).toEqual([]);
  });
  test('all valid paths finish, remain within capacity, and never mutate NASA observations', () => {
    const original = JSON.stringify(dataset.observations);
    let finished = 0;
    function visit(session: Session) {
      const resources = availableResources(session);
      for (const key of Object.keys(capacity) as (keyof typeof capacity)[]) {
        expect(resources[key]).toBeGreaterThanOrEqual(0);
        expect(resources[key]).toBeLessThanOrEqual(capacity[key]);
      }
      if (session.history.length === session.frames.length) {
        finished++;
        expect(trainingScore(session)).toBeGreaterThanOrEqual(0);
        expect(trainingScore(session)).toBeLessThanOrEqual(100);
        expect(() => commitDecision(session, 4, 'handoff-close')).toThrow();
        return;
      }
      const choices = stageFor(session, session.history.length).choices.filter((c) =>
        canAfford(c, resources),
      );
      expect(choices.length).toBeGreaterThan(0);
      for (const choice of choices)
        visit(commitDecision(session, session.history.length, choice.id));
    }
    visit(createSession(dataset));
    expect(finished).toBeGreaterThan(30);
    expect(JSON.stringify(dataset.observations)).toBe(original);
  });
  test('empty and single-acquisition responses never generate fake timestamps', () => {
    expect(createSession({ ...dataset, observations: [] }).frames).toEqual([]);
    const one = dataset.observations[0];
    if (!one) throw new Error('Missing fixture');
    const session = createSession({ ...dataset, observations: [one] });
    expect(session.frames).toHaveLength(1);
    expect(trainingScore(commitDecision(session, 0, 'interpret-detections'))).toBe(100);
  });
});
