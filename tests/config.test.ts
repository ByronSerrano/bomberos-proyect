import { describe, expect, test } from 'bun:test';
import { configSchema } from '@config';

describe('central environment config', () => {
  test('only nonsecret defaults are provided; unknown ENV fields are stripped', () => {
    const parsed = configSchema.parse({ OTHER_ENV: 'ignore' });
    expect(parsed.API_PORT).toBe(8787);
    expect(parsed.WEB_PORT).toBe(5173);
    expect(parsed.FIRMS_MAP_KEY).toBeUndefined();
    expect(parsed.E2E_BROWSER_PATH).toBeUndefined();
    expect(parsed.E2E_TARGET).toBe('development');
    expect('OTHER_ENV' in parsed).toBe(false);
  });
  test('credentials are trimmed, but a blank credential stays missing', () => {
    expect(configSchema.parse({ FIRMS_MAP_KEY: '  test-secret  ' }).FIRMS_MAP_KEY).toBe(
      'test-secret',
    );
    expect(configSchema.parse({ FIRMS_MAP_KEY: '  ' }).FIRMS_MAP_KEY).toBeUndefined();
    expect(configSchema.parse({ E2E_BROWSER_PATH: ' /usr/bin/chromium ' }).E2E_BROWSER_PATH).toBe(
      '/usr/bin/chromium',
    );
  });
  test('invalid or conflicting ports fail fast', () => {
    for (const value of [
      { API_PORT: 'bad' },
      { E2E_TARGET: 'invalid' },
      { API_PORT: 80 },
      { WEB_PORT: 65536 },
      { API_PORT: 5173, WEB_PORT: 5173 },
    ])
      expect(configSchema.safeParse(value).success).toBe(false);
  });
});
