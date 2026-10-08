import { describe, expect, test } from 'bun:test';
import { createHandler } from '@server/app';
import { ApiError } from '@server/nasa';

const query = {
  bbox: [-123, 53, -120, 56],
  date: '2023-07-12',
  days: 1,
  source: 'VIIRS_NOAA20_SP',
};
function post(body: unknown, origin = 'http://127.0.0.1:5173') {
  return new Request('http://127.0.0.1:8787/api/firms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
}
describe('local NASA gateway', () => {
  test('works without a key but refuses FIRMS queries instead of substituting a credential', async () => {
    const handle = createHandler({ mapKey: undefined, webPort: 5173 });
    const health = await handle(new Request('http://127.0.0.1:8787/api/health'));
    expect(await health.json()).toEqual({ ok: true, firmsConfigured: false, mode: 'local' });
    expect((await handle(post(query))).status).toBe(428);
    expect((await handle(post({ ...query, days: 7 }))).status).toBe(400);
  });
  test('rejects external origins and DNS-rebinding hosts', async () => {
    const handle = createHandler({ mapKey: undefined, webPort: 5173 });
    expect((await handle(post(query, 'https://attacker.invalid'))).status).toBe(403);
    expect((await handle(new Request('http://attacker.invalid/api/health'))).status).toBe(403);
  });
  test('health does not expose credentials, and unexpected upstream errors are redacted', async () => {
    const handle = createHandler({
      mapKey: 'test-secret',
      webPort: 5173,
      firms: async () => {
        throw new Error('https://nasa.invalid/test-secret');
      },
    });
    const health = await handle(new Request('http://127.0.0.1:8787/api/health'));
    expect(await health.text()).not.toContain('test-secret');
    const response = await handle(post(query));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('test-secret');
  });
  test('bounded requests and rate limits protect the upstream quota', async () => {
    const handle = createHandler({ mapKey: undefined, webPort: 5173 });
    expect((await handle(post({ large: 'x'.repeat(5000) }))).status).toBe(413);
    const other = createHandler({ mapKey: undefined, webPort: 5173 });
    for (let i = 0; i < 6; i++) await other(post(query));
    expect((await other(post(query))).status).toBe(429);
  });
  test('EONET works independently of FIRMS and preserves structured upstream failures', async () => {
    const handle = createHandler({
      mapKey: undefined,
      webPort: 5173,
      events: async () => ({ events: [], retrievedAt: '2026-09-04T00:00:00Z' }),
      firms: async () => {
        throw new ApiError(429, 'NASA rate limit');
      },
    });
    expect((await handle(new Request('http://127.0.0.1:8787/api/events'))).status).toBe(200);
    expect((await handle(post(query))).status).toBe(429);
  });
});
