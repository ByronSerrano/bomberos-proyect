import { describe, expect, test } from 'bun:test';
import { stages } from '@/domain/replay';
import { costLabel, processingLabel, satelliteLabel } from '@/lib/presentation';

function choice(id: string) {
  const found = stages.flatMap((stage) => stage.choices).find((item) => item.id === id);
  if (!found) throw new Error(`Falta la opción ${id}.`);
  return found;
}

describe('presentation labels', () => {
  test('cost labels use singular, plural and the hold in words', () => {
    expect(costLabel(choice('interpret-detections'))).toBe(
      '1 analista · esta etapa y la siguiente',
    );
    expect(costLabel(choice('interpret-wait'))).toBe('Sin asignación de recursos');
    expect(costLabel(choice('verify-field'))).toBe(
      '1 equipo · 1 logística · esta etapa y la siguiente',
    );
    expect(costLabel(choice('prepare-all'))).toBe('3 equipos · esta etapa y la siguiente');
  });
  test('satellite and processing labels stay readable', () => {
    expect(satelliteLabel('N')).toBe('Suomi NPP');
    expect(satelliteLabel('N20')).toBe('NOAA-20');
    expect(satelliteLabel('N21')).toBe('NOAA-21');
    expect(satelliteLabel('X')).toBe('X');
    expect(processingLabel('2.0NRT')).toBe('NRT');
    expect(processingLabel('1.0URT')).toBe('URT');
    expect(processingLabel('2.0SP')).toBe('SP');
    expect(processingLabel('custom')).toBe('custom');
  });
});
