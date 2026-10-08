import { join, resolve, sep } from 'node:path';
import { ApiError, getEvents, getFirms } from '@server/nasa';

interface Dependencies {
  mapKey: string | undefined;
  webPort: number;
  production?: boolean;
  events?: typeof getEvents;
  firms?: typeof getFirms;
}
export function createHandler(config: Dependencies) {
  const attempts: number[] = [];
  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const headers = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
    const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
    if (url.pathname.startsWith('/api/')) {
      // Local-only UI. Accept the exact API origin or the explicitly supported local Vite origin.
      const origin = request.headers.get('origin');
      const allowedOrigins = new Set([url.origin, `http://127.0.0.1:${config.webPort}`]);
      if (origin && !allowedOrigins.has(origin))
        return json({ error: 'Origen no permitido.' }, 403);
      if (request.headers.get('sec-fetch-site') === 'cross-site')
        return json({ error: 'Solicitud externa no permitida.' }, 403);
      if (!['127.0.0.1', 'localhost'].includes(url.hostname))
        return json({ error: 'Solo se permite acceso local.' }, 403);
      if (request.method === 'GET' && url.pathname === '/api/health')
        return json({ ok: true, firmsConfigured: Boolean(config.mapKey), mode: 'local' });
      try {
        if (request.method === 'GET' && url.pathname === '/api/events')
          return json(await (config.events ?? getEvents)());
        if (request.method === 'POST' && url.pathname === '/api/firms') {
          if (!request.headers.get('content-type')?.startsWith('application/json'))
            return json({ error: 'Se requiere JSON.' }, 415);
          while (attempts[0] && attempts[0] < Date.now() - 60000) attempts.shift();
          if (attempts.length >= 6)
            return json({ error: 'Límite local: 6 consultas por minuto. Espera un momento.' }, 429);
          attempts.push(Date.now());
          // Stream a bounded request; Content-Length cannot be trusted.
          let body = '';
          const reader = request.body?.getReader();
          const decoder = new TextDecoder();
          if (reader) {
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                body += decoder.decode(value, { stream: true });
                if (body.length > 4096)
                  return json({ error: 'La consulta es demasiado grande.' }, 413);
              }
              body += decoder.decode();
            } finally {
              await reader.cancel().catch(() => {});
            }
          }
          let input: unknown;
          try {
            input = JSON.parse(body);
          } catch {
            return json({ error: 'JSON inválido.' }, 400);
          }
          return json(await (config.firms ?? getFirms)(input, config.mapKey));
        }
        return json({ error: 'Ruta o método no encontrado.' }, 404);
      } catch (error) {
        if (error instanceof ApiError) return json({ error: error.message }, error.status);
        // Do not log upstream URLs or exception messages, which might include the MAP_KEY.
        return json(
          { error: 'No se pudo completar la consulta a NASA. El caso local sigue disponible.' },
          502,
        );
      }
    }
    if (config.production && request.method === 'GET') {
      const root = resolve('dist');
      let pathname: string;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        return new Response('Bad request', { status: 400 });
      }
      const path = resolve(join(root, pathname === '/' ? 'index.html' : pathname));
      if (!path.startsWith(root + sep)) return new Response('Forbidden', { status: 403 });
      const file = Bun.file(path);
      if (await file.exists())
        return new Response(file, {
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
          },
        });
    }
    return new Response('Not found', { status: 404 });
  };
}
