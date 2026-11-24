import SCHEMA_FILE from '../../product.schema.json'
import { readEntry, readInherits, readIsNodes, readKeys } from './themeSchemaReader'

/**
 * The one reader of product.schema.json, in either format (nodes, as api-core
 * writes it, or tuples): see src/utils/themeSchemaReader.js for both and for
 * how a node's `$type` is normalized to the tuple kind.
 *
 * Every helper takes the schema last, the repo's by default. SCHEMA is the
 * whole file, editor metadata included: app code does not import this
 * module. It imports the block it reads by name and passes it to
 * the reader (src/utils/themePages.js does `{ pages }`); the production
 * build bundles it as tuples, without the editor's metadata (vite.config.js).
 *
 * Paths are dotted strings or arrays of segments. In `visibility` and
 * `images` everything after the block is the key: 'visibility.business
 * .header.info' is the key 'business.header.info'.
 */

export const SCHEMA = SCHEMA_FILE

/** Whether the schema is in the node format. */
export const isNodeSchema = (schema = SCHEMA) => readIsNodes(schema)

/**
 * The entry at `path`: `{ type, value, options, formats, hints, follows }`,
 * or undefined when there is no node there (a group is not an entry).
 */
export const schemaEntry = (path, schema = SCHEMA) => readEntry(schema, path)

/** The default at `path` (the entry's value). */
export const schemaDefault = (path, schema = SCHEMA) => readEntry(schema, path)?.value

/** The options at `path` (an option, a layout, a rounding's levels), or undefined. */
export const schemaOptions = (path, schema = SCHEMA) => readEntry(schema, path)?.options

/** The names under the group at `path`, in the file's order, without the `$` keys. */
export const schemaKeys = (path, schema = SCHEMA) => readKeys(schema, path)

/** The component `component` inherits from (`card` for `business_card`), or undefined. */
export const schemaInherits = (component, schema = SCHEMA) => readInherits(schema, component)
