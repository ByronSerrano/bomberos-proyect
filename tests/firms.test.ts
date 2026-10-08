import { describe, expect, test } from 'bun:test';
import { acquisitionTime, parseFirmsCsv } from '@/data/firms';
import { datasetSchema, firmsQuerySchema } from '@/domain/models';

const header =
  'latitude,longitude,acq_date,acq_time,frp,confidence,satellite,version,scan,track,daynight';
const row = '54,-121,2023-07-12,958,12,n,N,2.0NRT,0.4,0.5,D';
describe('FIRMS data integrity', () => {
  test('UTC HHMM values retain leading zeroes and reject invalid dates', () => {
    expect(acquisitionTime('2023-07-12', '3')).toBe('2023-07-12T00:03:00.000Z');
    expect(acquisitionTime('2023-07-12', '958')).toBe('2023-07-12T09:58:00.000Z');
    for (const [date, time] of [
      ['2023-02-30', '800'],
      ['2023-07-12', '2461'],
      ['x', '700'],
    ]) {
      expect(() => acquisitionTime(date ?? '', time ?? '')).toThrow();
    }
  });
  test('deduplicates the same acquisition, preferring NRT over URT', () => {
    const result = parseFirmsCsv(
      [header, row.replace('2.0NRT', '2.0URT'), row].join('\n'),
      [-123, 53, -120, 56],
    );
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.version).toBe('2.0NRT');
    expect(result.duplicatesRemoved).toBe(1);
  });
  test('rejects invalid rows and does not coerce missing measurements to zero', () => {
    const result = parseFirmsCsv(
      [
        header,
        row,
        row.replace(',12,', ',,'),
        row.replace(',12,', ',-1,'),
        row.replace('54,-121', '20,20'),
      ].join('\n'),
      [-123, 53, -120, 56],
    );
    expect(result.observations).toHaveLength(1);
    expect(result.rejectedRows).toBe(2);
  });
  test('rejects upstream HTML, invalid headers, and malformed CSV', () => {
    expect(() => parseFirmsCsv('<html>Invalid key</html>', [-123, 53, -120, 56])).toThrow();
    expect(() => parseFirmsCsv(`${header}\n"unterminated`, [-123, 53, -120, 56])).toThrow();
  });
  test('query bounds, product and dates are restricted before sending credentials', () => {
    const base = {
      bbox: [-123, 53, -120, 56],
      date: '2023-07-12',
      days: 1,
      source: 'VIIRS_NOAA20_SP',
    };
    expect(firmsQuerySchema.safeParse(base).success).toBe(true);
    for (const change of [
      { bbox: [-120, 56, -123, 53] },
      { bbox: [-180, -85, 180, 85] },
      { days: 6 },
      { date: '2023-02-30' },
      { source: 'https://attacker.invalid' },
    ])
      expect(firmsQuerySchema.safeParse({ ...base, ...change }).success).toBe(false);
  });
  test('bundled evidence contains real source rows and only the selected sector', async () => {
    const dataset = datasetSchema.parse(await Bun.file('public/data/bc-2023-07-12.json').json());
    expect(dataset.observations).toHaveLength(69);
    expect(dataset.sourceRows).toBe(74605);
    expect(dataset.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect([...new Set(dataset.observations.map((p) => p.acquiredAt.slice(11, 16)))]).toEqual([
      '09:58',
      '10:00',
      '11:40',
      '19:49',
    ]);
    expect(
      dataset.observations.every(
        (p) => p.latitude >= 53 && p.latitude <= 56 && p.longitude >= -123 && p.longitude <= -120,
      ),
    ).toBe(true);
  });
});
