import { ArrowLeft, ChevronUp, ClipboardList, House, MapPin, MapPinned, Menu, Search, ShoppingBasket, ShoppingCart, User, Utensils, X } from 'lucide-react'
import { createIcon } from '~ui/src/design-system/components/createIcon'

// The header's and the bottom bar's icons: the registry's own Lucide glyphs
// under the same names (lucideRegistry.js), except `cardChecklist`, the
// ClipboardList Sergio chose for the orders option (the registry still has
// ListChecks until IC). The header is in the entry chunk: its icon
// takes these fourteen, not the whole registry, which would add ~16 kB gzip to
// every first load.
export const HEADER_GLYPHS = {
  arrowLeft: ArrowLeft,
  basketFilled: ShoppingBasket,
  caretUpFill: ChevronUp,
  cardChecklist: ClipboardList,
  close: X,
  geoAltFill: MapPin,
  house: House,
  locationFood: Utensils,
  mapMarker: MapPin,
  menuBars: Menu,
  pinMapFill: MapPinned,
  search: Search,
  shoppingCart: ShoppingCart,
  userOutline: User
}

/** The design system's icon (same props: `size` by level, `label`, `1em` and decoration by default) over the header's glyphs. */
export const HeaderIcon = createIcon(HEADER_GLYPHS)
