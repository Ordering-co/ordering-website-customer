import { FILLED_ICONS, LUCIDE_ICON_REGISTRY } from '~ui/src/components/Icon/lucideRegistry'
import { createIcon } from './createIcon'

/**
 * An icon of the registry (`src/ui/src/components/Icon/lucideRegistry.js`:
 * Lucide plus the monochrome brand glyphs), the design system's one. Its
 * props (`name`, `size`, `label`, the rest to the `<svg>`) are those of
 * `createIcon`; a solid glyph (FILLED_ICONS: the favorite heart, the rating
 * star) is filled with the text color.
 */
export const Icon = createIcon(LUCIDE_ICON_REGISTRY, FILLED_ICONS)
