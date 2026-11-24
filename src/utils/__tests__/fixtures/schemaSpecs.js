import { schemaEntry, schemaKeys } from '../../themeSchema'
import { pathSegments } from '../../themeSchemaReader'

/**
 * What the schema says of a property, whatever its format (src/utils/
 * themeSchema.js): `{ type, default, options? }`, or undefined.
 */
export const spec = (path, schema) => {
  const entry = schemaEntry(path, schema)
  if (!entry) return undefined
  return entry.options ? { type: entry.type, default: entry.value, options: entry.options } : { type: entry.type, default: entry.value }
}

/** spec() of every property of the group at `path`, by name. */
export const specs = (path, schema) => {
  const segments = pathSegments(path)
  return Object.fromEntries(schemaKeys(segments, schema).map((key) => [key, spec([...segments, key], schema)]))
}
