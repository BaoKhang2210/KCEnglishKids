import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // §3.5 — PWA: app cài được + shell offline cho trẻ (học liệu đã có learning-assets-sw giữ riêng).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icons/icon.svg'],
      manifest: {
        name: 'KCEnglishKids — Học tiếng Anh cho bé',
        short_name: 'KC Kids',
        description: 'Nền tảng học tiếng Anh tương tác cho trẻ mầm non 3–6 tuổi: bài học, trò chơi, phần thưởng.',
        lang: 'vi',
        display: 'standalone',
        orientation: 'landscape',
        theme_color: '#f59e0b',
        background_color: '#fffbeb',
        icons: [
          { src: '/pwa-icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App shell offline; login/API vẫn cần mạng nhưng trang chủ mở được.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith('/images/') || url.pathname.startsWith('/audio/')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kc-pwa-learning',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kc-pwa-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
