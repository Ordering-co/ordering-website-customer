import { Calendar, Car, CarFront, Check, Clock, MapPin, ShoppingBag, Store, Truck } from 'lucide-react'

// The order context's icons (the type tabs, the moment, the address): the
// registry's own Lucide glyphs under the same names (lucideRegistry.js). The
// header is in the entry chunk: its icon takes these nine, not the
// whole registry, which would add ~16 kB gzip to every first load.
export const ORDER_CONTEXT_GLYPHS = {
  bag: ShoppingBag,
  calendar: Calendar,
  car: Car,
  carFront: CarFront,
  check: Check,
  clockOutline: Clock,
  mapMarker: MapPin,
  shop: Store,
  truckOutline: Truck
}
