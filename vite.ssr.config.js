import { localMarketplaceConfig } from './scripts/marketplace/local-config-plugin.mjs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { tupleSchema } from './src/utils/themeSchemaReader.js'

/**
 * Build of the landing's server render (implementation notes , Full Website): the Worker
 * paints `/` with the REAL components of src/pages/Landing (`renderToString`)
 * and the client swaps that markup for its own render (docs/FULL_WEBSITE.md).
 *
 *   vite build -c vite.ssr.config.js   (`pnpm build` runs it after the client build)
 *
 * One ESM file for workerd, `worker/generated/landing-ssr.mjs` (not versioned),
 * which worker/landingSsr.js loads with a dynamic import so the routes that do
 * not paint the landing never evaluate it. Everything is bundled
 * (`ssr.noExternal`) because workerd has no node_modules.
 */

const root = __dirname
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const stub = (name) => path.join(root, 'src/pages/Landing/ssr/stubs', name)

// The same lean schema as the client build (vite.config.js themeSchemaForRuntime, implementation notes ).
const themeSchemaForRuntime = () => ({
  name: 'theme-schema-runtime',
  enforce: 'pre',
  transform (code, id) {
    if (!id.replace(/\?.*$/, '').endsWith(`${path.sep}product.schema.json`)) return null
    return { code: JSON.stringify(tupleSchema(JSON.parse(code))), map: null }
  }
})

// workerd first: its builds of the libraries (react-dom/server → the edge build) run without Node.
const conditions = ['workerd', 'worker', 'browser']

export default defineConfig({
  plugins: [
    localMarketplaceConfig(),
    // ssr: false → no per-file component ids: nothing hydrates, the client's own sheet names its classes.
    react({ babel: { plugins: [['babel-plugin-styled-components', { displayName: false, fileName: false, pure: true, ssr: false }]] } }),
    themeSchemaForRuntime()
  ],
  publicDir: false,
  resolve: {
    dedupe: ['react', 'react-dom', 'scheduler'],
    conditions,
    alias: [
      { find: /^smart-app-banner$/, replacement: path.join(root, 'src/shims/ordering-sab.js') },
      { find: /^~components\//, replacement: path.join(root, 'src/@/components/src') + '/' },
      { find: /^~components$/, replacement: path.join(root, 'src/@/components/src') },
      { find: /^~ui\//, replacement: path.join(root, 'src/ui') + '/' },
      { find: /^~ui$/, replacement: path.join(root, 'src/ui') },
      { find: /^~ui-icon$/, replacement: path.join(root, 'src/ui/src/components/Icon') },
      { find: /^~\//, replacement: path.join(root, 'src') + '/' },
      // the client's DOM renderer and the socket client are dead weight on the server
      { find: /^react-dom$/, replacement: stub('react-dom.js') },
      { find: /^socket\.io-client$/, replacement: stub('socket-io.js') }
    ]
  },
  esbuild: { loader: 'jsx', include: /src\/.*\.jsx?$/, exclude: [] },
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.PUBLIC_URL': JSON.stringify(''),
    'process.env.npm_package_version': JSON.stringify(pkg.version),
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify('')
  },
  ssr: { target: 'webworker', noExternal: true, resolve: { conditions } },
  build: {
    ssr: path.join(root, 'src/pages/Landing/ssr/render.jsx'),
    outDir: path.join(root, 'worker/generated'),
    emptyOutDir: true,
    // a server build is not minified by default: the Worker parses this file on each cold start
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: { output: { format: 'es', entryFileNames: 'landing-ssr.mjs', inlineDynamicImports: true } }
  }
})
