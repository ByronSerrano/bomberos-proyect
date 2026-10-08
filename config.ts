import { z } from 'zod';

// Only server/build tooling may import this module. Never expose credentials to Vite client code.
if (typeof window !== 'undefined') throw new Error('config.ts es exclusivo del servidor local.');

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);
const port = z.coerce.number().int().min(1024).max(65535);
export const configSchema = z
  .object({
    API_PORT: port.default(8787),
    WEB_PORT: port.default(5173),
    // Intentionally no default/fallback. Required by FIRMS requests, not by offline replay.
    FIRMS_MAP_KEY: optionalTrimmedString,
    // Optional local Chromium path for browser tests; otherwise use Playwright's browser.
    E2E_BROWSER_PATH: optionalTrimmedString,
    E2E_TARGET: z.enum(['development', 'production']).default('development'),
  })
  .strip()
  .refine((value) => value.API_PORT !== value.WEB_PORT, {
    message: 'API_PORT y WEB_PORT deben ser distintos.',
    path: ['WEB_PORT'],
  });

// Bun loads .env automatically. All environment access lives here.
export const config = Object.freeze(configSchema.parse(process.env));
