import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Same-origin API in dev, mirroring nginx in production: the browser calls /api on the
  // Vite server, which forwards to the backend. Works from phones on the LAN too, where
  // "localhost" would point at the phone itself.
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LoopHole',
        short_name: 'LoopHole',
        description: 'Track your subscriptions and get reminded before they renew.',
        start_url: '/',
        scope: '/',
        theme_color: '#111111',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Auth, subscriptions and vault secrets are all live per-user data — never cache
        // /api/* responses, only let the app shell (JS/CSS/HTML/icons) work offline.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ]
})