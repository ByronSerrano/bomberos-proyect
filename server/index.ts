import { config } from '@config';
import { createHandler } from '@server/app';

const port = config.API_PORT;
const production = process.argv.includes('--production');
if (production && !(await Bun.file('dist/index.html').exists()))
  throw new Error('Ejecuta bun run build antes de bun start.');
const server = Bun.serve({
  hostname: '127.0.0.1',
  port,
  maxRequestBodySize: 4096,
  fetch: createHandler({ mapKey: config.FIRMS_MAP_KEY, webPort: config.WEB_PORT, production }),
});
console.info(`Disaster Replay ${production ? 'app' : 'API'}: http://127.0.0.1:${server.port}`);
console.info(
  `FIRMS: ${config.FIRMS_MAP_KEY ? 'clave configurada' : 'caso local disponible; consulta histórica requiere .env'}`,
);
