import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { createProviderProxy } from './vite.proxy.ts';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Keys stay server side (see docs/specs/0001-news-api-proxy-architecture.md); the
    // production equivalent is the nginx reverse proxy built alongside the Docker setup.
    // Empty prefix: these are deliberately NOT VITE_-prefixed, so they must be loaded
    // explicitly rather than relying on Vite's default client-exposed env loading.
    proxy: createProviderProxy(loadEnv(mode, process.cwd(), '')),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
}));
