import { resolve } from 'node:path';

const project = resolve(import.meta.dir, '..');
const children = [
  Bun.spawn(['bun', '--watch', 'server/index.ts'], {
    cwd: project,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'ignore',
  }),
  Bun.spawn(
    ['bun', '--bun', 'vite', '--configLoader', 'native', '--host', '127.0.0.1', '--strictPort'],
    {
      cwd: project,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    },
  ),
];
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  void Promise.all(children.map((child) => child.exited)).finally(() => process.exit(code));
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
const code = await Promise.race(children.map((child) => child.exited));
stop(code);
