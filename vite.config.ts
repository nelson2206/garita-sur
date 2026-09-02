import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode artifact` genera un solo archivo HTML para publicarlo como página compartible.
export default defineConfig(({ mode }) => mode === 'artifact' ? {
  plugins: [react(), VitePWA({ disable: true }), viteSingleFile()],
  build: { outDir: 'dist-artifact', emptyOutDir: true },
} : {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Garita Sur',
        short_name: 'Garita Sur',
        description: 'Control de acceso para condominios de playa',
        lang: 'es-PE',
        theme_color: '#16232B',
        background_color: '#F2F3EF',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: { navigateFallback: 'index.html', globPatterns: ['**/*.{js,css,html,svg,woff2}'] },
    }),
  ],
  server: { port: 5173, host: true },
  base: './',
});
