import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  if (command === 'serve') {
    // Dev server config
    return {
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          manifest: {
            name: 'Microscoping',
            short_name: 'Microscoping',
            description: 'A collaborative timeline application',
            theme_color: '#222',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            runtimeCaching: [
              {
                urlPattern: ({ url }) => {
                  return url.pathname.startsWith("/microscoping");
                },
                handler: "CacheFirst",
                options: {
                  cacheName: "microscope-web-cache",
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          },
        })
      ],
      base: '/',
    }
  } else {
    // Build config
    return {
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          manifest: {
            name: 'Microscoping',
            short_name: 'Microscoping',
            description: 'A collaborative timeline application',
            theme_color: '#222',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            runtimeCaching: [
              {
                urlPattern: ({ url }) => {
                  return url.pathname.startsWith("/microscoping");
                },
                handler: "CacheFirst",
                options: {
                  cacheName: "microscope-web-cache",
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          },
        })
      ],
      base: '/microscoping/',
    }
  }
})
