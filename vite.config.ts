import { fileURLToPath, URL } from 'node:url';
import { config } from '@config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: '127.0.0.1',
      port: config.WEB_PORT,
      strictPort: true,
      proxy: { '/api': `http://127.0.0.1:${config.API_PORT}` },
    },
    preview: { port: 4173, strictPort: true },
    build: { target: 'es2022' },
  };
});
