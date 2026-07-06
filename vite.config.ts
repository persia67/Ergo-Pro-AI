import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          manifest: {
            name: 'ErgoPro AI',
            short_name: 'ErgoPro',
            description: 'Advanced Ergonomic Assessment Suite',
            theme_color: '#0d1117',
            background_color: '#ffffff',
            display: 'standalone',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}']
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
