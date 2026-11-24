import { MessageSquare } from 'lucide-react'
import { addEmptyStateGlyph } from './emptyStateGlyphs'

// The chat glyph of Messages' empty state, out of the entry chunk: only the lazy Messages page imports this
// module, which adds it to the empty states' glyphs (lucide-react stays inside Icon/, as the icon guard asks).
addEmptyStateGlyph('chat', MessageSquare)
