const TEMPLATE_DESCRIPTIONS = new Set([
  'food marketplace by ordering.inc',
  'food marketplace by ordering.inc.',
  'food marketplace by orderingplus',
  'food marketplace by orderingplus.',
  'a dummy description about this page'
])

export const resolveSeoDescription = (...values) => {
  for (const value of values) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue
    if (TEMPLATE_DESCRIPTIONS.has(trimmed.toLowerCase())) continue
    return trimmed
  }
  return null
}
