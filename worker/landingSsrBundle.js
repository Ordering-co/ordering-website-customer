// Loads the landing's SSR bundle (worker/generated/landing-ssr.mjs, built by `pnpm build`, not versioned).
// A module of its own so tests can mock it without the built file on disk (a clean checkout, CI).
// The specifier is a variable on purpose: wrangler's esbuild would inline a literal import into index.js
// (parsed on every cold start); this way the bundle stays a module apart, which wrangler.toml uploads
// (`find_additional_modules`) and only `/` of a Full Website evaluates.
const LANDING_SSR_BUNDLE = './generated/landing-ssr.mjs'

export const loadLandingSsr = () => import(/* @vite-ignore */ LANDING_SSR_BUNDLE)
