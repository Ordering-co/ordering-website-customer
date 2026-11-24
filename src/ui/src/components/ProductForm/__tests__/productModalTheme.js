// A theme with these keys in `components.product_modal.base`, set on a copy of
// its values: the engine's schema drops a key it does not know yet, so
// buildAppTheme cannot carry them, and the helpers under test only read
// `theme.values` (never its CSS view), so a copy of the values is enough.
export const withModalBase = (theme, base) => {
  const values = JSON.parse(JSON.stringify(theme.values))
  values.components.product_modal.base = { ...values.components.product_modal.base, ...base }
  return { ...theme, values }
}
