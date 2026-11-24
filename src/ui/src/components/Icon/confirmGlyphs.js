import { X } from 'lucide-react'
import { createIcon } from '~ui/src/design-system/components/createIcon'

// Confirm is in the entry chunk (src/index.js): its close icon takes this one
// glyph, not the whole registry (`Icon`), which added ~12 kB gzip to every
// first load (R2 of the design stage, implementation notes).
export const CONFIRM_GLYPHS = { closeLine: X }

/** The design system's icon (same props) over Confirm's glyph. */
export const ConfirmIcon = createIcon(CONFIRM_GLYPHS)
