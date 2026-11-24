import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { THEME_DEFAULTS } from '~/utils/appTheme'
import { catalogEntries, keysFromTokens } from '../tokens/catalog.mjs'
import { mergeTheme, tailwindLines } from '../tokens/tailwind.mjs'

// The names tailwind-merge has to know are the stylesheet's: the same catalog
// and aliases the generator writes into the `@theme` (tokens/tailwind.mjs), so
// a token added to the schema is known here without touching this file.
// Without them it would not know `ui:text-button` is a size and
// `ui:text-primary-foreground` a color, and would drop one of the two.
const theme = mergeTheme(tailwindLines(catalogEntries(keysFromTokens(THEME_DEFAULTS.tokens), () => ({ size: '', line: '', weight: '' }))))

const merge = extendTailwindMerge({ prefix: 'ui', extend: { theme } })

/**
 * The dashboard's `cn`: clsx for the conditions, tailwind-merge so the class a
 * caller passes wins over the piece's own (`cn(variants(), className)`).
 */
export const cn = (...inputs) => merge(clsx(inputs))
