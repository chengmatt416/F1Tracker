import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'F1 Tracker Pro',
          short_name: 'F1 Tracker',
          description: 'Real-time F1 telemetry, standings, and AI insights.',
          theme_color: '#15151E',
          background_color: '#15151E',
          display: 'standalone',
          icons: [
            {
              src: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677244984/content/dam/fom-website/manual/Misc/2023-pre-season/F1_logo.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://media.formula1.com/image/upload/f_auto/q_auto/v1677244984/content/dam/fom-website/manual/Misc/2023-pre-season/F1_logo.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
