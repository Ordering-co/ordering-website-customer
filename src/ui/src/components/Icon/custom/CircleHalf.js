import { createLucideIcon } from 'lucide-react'

// Lucide has no circle with its left half solid; pizza halves (ProductOptionSubOption) need exactly that.
export const CircleHalf = createLucideIcon('CircleHalf', [
  ['circle', { cx: '12', cy: '12', r: '10', key: 'ring' }],
  ['path', { d: 'M12 2a10 10 0 0 0 0 20z', fill: 'currentColor', key: 'half' }]
])
