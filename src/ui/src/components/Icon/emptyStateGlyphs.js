import { Heart, History, MapPin, Receipt, Search, ShoppingBag, Signpost, Star, Store, Ticket, UserPlus, Wallet, WifiOff, CreditCard } from 'lucide-react'
import { createIcon } from '~ui/src/design-system/components/createIcon'

// The empty states' icons (NotFoundSource's `icon`, EmptyStateIcon): the registry's own Lucide glyphs under the
// same names (lucideRegistry.js). NotFoundSource is in the entry chunk: its icon takes these fourteen,
// not the whole registry. A new name for an empty state goes here and in lucideRegistry; one only a lazy page
// draws (`chat`, MessagesListing) is added by that page with `addEmptyStateGlyph`, so the entry does not carry it.
export const EMPTY_STATE_GLYPHS = {
  bag: ShoppingBag,
  clockHistory: History,
  creditCardFront: CreditCard,
  geoAlt: MapPin,
  heartBs: Heart,
  receipt: Receipt,
  search: Search,
  shop: Store,
  signpost: Signpost,
  star: Star,
  ticket: Ticket,
  userAdd: UserPlus,
  wallet: Wallet,
  wifiOff: WifiOff
}

/** Adds a glyph of the registry to the empty states' icons: for a page outside the entry chunk. */
export const addEmptyStateGlyph = (name, glyph) => { EMPTY_STATE_GLYPHS[name] = glyph }

/** The design system's icon (same props) over the empty states' glyphs. */
export const EmptyStateGlyph = createIcon(EMPTY_STATE_GLYPHS)
