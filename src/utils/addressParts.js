/**
 * The pieces of a geocoded address the form shows as separate fields. The street line is what a
 * geocoded address says before its first comma ("3535 Odyssey Drive, Mississauga, Ontario L5M 7Z7, Canada").
 */
export const streetLineOf = (address) => String(address ?? '').split(',')[0].trim()

/**
 * The `address` text that goes with a corrected street line and the city, state, postal code and country, in the
 * order Mapbox writes a full address. Without a street line there is no address: the form then asks for it.
 */
export const composeAddress = (line, { city, state, zipcode, country } = {}) => {
  const street = String(line ?? '').trim()
  if (!street) return ''
  return [street, city, [state, zipcode].filter(Boolean).join(' '), country].filter(Boolean).join(', ')
}
