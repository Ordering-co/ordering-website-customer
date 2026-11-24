import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

// The chevron's three glyphs (styles/Chevron): the chevron is in the entry chunk (the header has it), so it
// takes these three and not the whole registry. The only place outside the pieces that imports
// lucide-react for it: the control imports this map and calls createIcon with it.
export const CHEVRON_GLYPHS = { chevronDown: ChevronDown, chevronLeft: ChevronLeft, chevronRight: ChevronRight }

// Lucide's ChevronDown (the same path and stroke) as a mask: the same glyph
// where the chevron is drawn by a library's element and not by an svg of ours.
export const CHEVRON_DOWN_MASK = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23000\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")'
