export const buildPwaPluginOptions = () => ({
  disable: false,
  registerType: 'autoUpdate',
  injectRegister: null,
  manifest: false,
  workbox: {
    globPatterns: ['**/*.{js,css,svg,png,jpg,jpeg,webp,woff,woff2,ico}'],
    // The map illustration is optional. A failed request must never fail SW installation.
    globIgnores: ['**/index.html', '**/*.html', '**/manifest.json', '**/address-map-illustration-*.svg'],
    navigateFallback: null,
    navigateFallbackDenylist: [/.*/],
    maximumFileSizeToCacheInBytes: 15 * 1024 * 1024
  },
  // A Vite-dev SW intercepts the HMR websocket. Register only after `pnpm build`.
  devOptions: { enabled: false }
})
