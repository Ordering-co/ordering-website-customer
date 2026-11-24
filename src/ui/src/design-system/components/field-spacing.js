// Border shorthands in componentVars start with the resolved width. A state
// without a border keeps the resting border and therefore has no padding delta.
export const fieldBorderDeltas = (vars) => {
  const resting = Number.parseFloat(vars['--ui-input-border']) || 0
  return Object.fromEntries(['hover', 'focus', 'error'].map((state) => {
    const border = vars[`--ui-input-${state}-border`]
    const width = border == null ? resting : Number.parseFloat(border) || 0
    return [`--ui-field-${state}-delta`, `${width - resting}px`]
  }))
}
