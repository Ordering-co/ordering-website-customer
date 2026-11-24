/**
 * How a theme schema is read, in either of its two formats. The API is
 * src/utils/themeSchema.js, which wraps these with the repo's own schema;
 * this module imports nothing, so it can be used where that one cannot:
 *
 * - app code of the entry chunk, which passes only the block it
 *   reads (`{ pages }`, imported by name from product.schema.json) instead of
 *   the whole file. The production build bundles the schema as tuples
 *   (tupleSchema(), vite.config.js): the same entries, without the editor's
 *   metadata nor the nodes' keys;
 * - Node scripts (scripts/theme/*.mjs), which cannot import a JSON file
 *   without an import attribute.
 *
 * The formats (api-core docs/THEMES_V2_SCHEMA_FORMAT.md):
 *
 * - nodes (`$schema: 'urn:ordering:theme-schema:1'`): a leaf is a node,
 *   `{ $value, $type?, $extensions? }`; any other object is a group, whose
 *   `$type` applies to the nodes under it that declare none. What the engine
 *   reads is in `$extensions['co.ordering']` (scale, options, inherits,
 *   follows, derive, matrix, formats, hints, and a visibility key's
 *   platforms: its default on each platform that shows it otherwise).
 * - tuples: components, pages and site are `[kind, default, options?]`;
 *   `visibility.<key>` is its boolean default, or `[default, null,
 *   { platform: bool }]` when a platform shows it otherwise (api-core's
 *   `[default, version 1 path, platforms]`); `images.<key>` is
 *   `[default, formats | null, hints]`; tokens are plain values (no type);
 *   a slot (`components.<c>.slots.<name>`) is its plain value; which
 *   component inherits from which is the root `inherits` block.
 *
 * An entry is `{ type, value, options, formats, hints, follows, platforms }` whatever
 * the format. `type` is the tuple kind: a node's `$type` is normalized to it
 * where the two match one to one (§3 of that document):
 *
 *   dimension + scale radius | size | icon | space  → that scale
 *   duration → motion,  typography → text,  fontRole → font_role,
 *   boolean → bool
 *
 * and the rest stay as they are (color, role, opacity, number, border,
 * shadow, image, option, layout, sections, string, html, id, and the ones
 * no tuple has: slot, font, a dimension without a scale).
 */

export const NODE_SCHEMA_ID = 'urn:ordering:theme-schema:1'

/** The engine's extension of a node or group. */
export const ENGINE = 'co.ordering'

// Blocks whose keys are the paths the theme serves, so they carry dots.
const FLAT_BLOCKS = ['visibility', 'images']

const NODE_TYPES = {
  duration: 'motion',
  typography: 'text',
  fontRole: 'font_role',
  boolean: 'bool'
}

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

const isMeta = (key) => typeof key === 'string' && key.startsWith('$')

/** Whether a value of a schema in nodes is a node (it has `$value`). */
export const isNode = (value) => isObject(value) && Object.prototype.hasOwnProperty.call(value, '$value')

const engineOf = (node) => (isObject(node?.$extensions?.[ENGINE]) ? node.$extensions[ENGINE] : {})

/** The tuple kind of a node's `$type` (see above). */
export const kindOfType = (type, scale) => {
  if (typeof type !== 'string') return undefined
  if (type === 'dimension') return typeof scale === 'string' ? scale : 'dimension'
  return NODE_TYPES[type] ?? type
}

const hasMetaKey = (value, depth = 0) => {
  if (Array.isArray(value)) return false
  if (!isObject(value) || depth > 12) return false
  return Object.keys(value).some((key) => isMeta(key) || hasMetaKey(value[key], depth + 1))
}

const formatCache = new WeakMap()

/**
 * Whether a schema is in nodes: its `$schema` names the node format. A part
 * of a schema (the blocks the entry chunk imports by name) has no `$schema`:
 * it is in nodes when any of its objects has a `$` key, which no tuple
 * schema has (its names are `[a-z0-9_]`).
 */
export const readIsNodes = (schema) => {
  if (!isObject(schema)) return false
  if (Object.prototype.hasOwnProperty.call(schema, '$schema')) return schema.$schema === NODE_SCHEMA_ID
  if (!formatCache.has(schema)) formatCache.set(schema, hasMetaKey(schema))
  return formatCache.get(schema)
}

/**
 * A path as its segments: a dotted string or an array. In `visibility` and
 * `images` everything after the block is one key ('visibility.business
 * .header.info' → ['visibility', 'business.header.info']).
 */
export const pathSegments = (path) => {
  const segments = Array.isArray(path)
    ? path.map(String)
    : (typeof path === 'string' && path ? path.split('.') : [])
  if (FLAT_BLOCKS.includes(segments[0]) && segments.length > 2) return [segments[0], segments.slice(1).join('.')]
  return segments
}

const entry = (type, value, own = {}) => ({
  type,
  value,
  options: Array.isArray(own.options) ? own.options : undefined,
  formats: own.formats ?? undefined,
  hints: own.hints ?? undefined,
  follows: own.follows ?? undefined,
  platforms: own.platforms ?? undefined
})

const nodeEntry = (schema, segments) => {
  let node = schema
  let groupType
  for (const segment of segments) {
    if (!isObject(node) || isNode(node) || isMeta(segment) || !Object.prototype.hasOwnProperty.call(node, segment)) return undefined
    if (typeof node.$type === 'string') groupType = node.$type
    node = node[segment]
  }
  if (!isNode(node)) return undefined
  const own = engineOf(node)
  return entry(kindOfType(node.$type ?? groupType, own.scale), node.$value, own)
}

const tupleEntry = (schema, segments) => {
  const [block, ...rest] = segments
  if (!rest.length || !isObject(schema?.[block])) return undefined
  if (block === 'visibility') {
    const value = schema.visibility[rest[0]]
    if (!Object.prototype.hasOwnProperty.call(schema.visibility, rest[0]) || isObject(value)) return undefined
    return Array.isArray(value) ? entry('bool', value[0], { platforms: isObject(value[2]) ? value[2] : undefined }) : entry('bool', value)
  }
  if (block === 'images') {
    const value = schema.images[rest[0]]
    return Array.isArray(value) ? entry('image', value[0], { formats: value[1], hints: value[2] }) : undefined
  }
  let node = schema[block]
  for (const segment of rest) {
    if (!isObject(node) || !Object.prototype.hasOwnProperty.call(node, segment)) return undefined
    node = node[segment]
  }
  if (block === 'tokens') return node === undefined ? undefined : entry(undefined, node)
  if (block === 'components' && rest.length === 3 && rest[1] === 'slots' && isObject(node)) return entry('slot', node)
  if (Array.isArray(node) && typeof node[0] === 'string' && node.length >= 2) return entry(node[0], node[1], { options: node[2] })
  return undefined
}

/**
 * The entry at `path`, or undefined when the schema has no node there (a
 * group is not an entry). A token of a schema in tuples has no type.
 */
export const readEntry = (schema, path) => {
  const segments = pathSegments(path)
  if (!segments.length || !isObject(schema)) return undefined
  return readIsNodes(schema) ? nodeEntry(schema, segments) : tupleEntry(schema, segments)
}

/**
 * The names under the group at `path`, in the file's order, without the `$`
 * keys; [] for a node, a tuple or a path the schema lacks. An empty path
 * gives the root's blocks.
 */
export const readKeys = (schema, path) => {
  let node = schema
  for (const segment of pathSegments(path)) {
    if (!isObject(node) || isMeta(segment)) return []
    node = node[segment]
  }
  if (!isObject(node) || isNode(node)) return []
  return Object.keys(node).filter((key) => !isMeta(key))
}

/** The component `component` inherits from (`card` for `business_card`), or undefined. */
export const readInherits = (schema, component) => {
  if (!isObject(schema)) return undefined
  if (readIsNodes(schema)) return engineOf(schema.components?.[component]).inherits ?? undefined
  return isObject(schema.inherits) ? (schema.inherits[component] ?? undefined) : undefined
}

// ── Tuples ───────────────────────────────────────────────────────────────

const VARIANT_SECTIONS = ['variants', 'sizes', 'shapes', 'colors', 'appearances']

const children = (node) => (isObject(node) ? Object.keys(node).filter((key) => !isMeta(key)) : [])

const mapChildren = (node, fn) => Object.fromEntries(children(node).map((key) => [key, fn(node[key], key)]))

/** A node as its tuple `[kind, default, options?]`; one without a type is its value. */
const tupleOf = (node, groupType) => {
  if (!isNode(node)) return node
  const own = engineOf(node)
  const kind = kindOfType(node.$type ?? groupType, own.scale)
  if (kind === undefined) return node.$value
  return Array.isArray(own.options) ? [kind, node.$value, own.options] : [kind, node.$value]
}

/** A group whose nodes become tuples, at any depth (a scope's changes, `site`). */
const tupleTree = (node, groupType) => {
  if (isNode(node)) return tupleOf(node, groupType)
  if (!isObject(node)) return node
  const type = typeof node.$type === 'string' ? node.$type : groupType
  return mapChildren(node, (child) => tupleTree(child, type))
}

const followsOf = (props, path, follows) => {
  children(props).forEach((prop) => {
    const group = isNode(props[prop]) ? engineOf(props[prop]).follows : undefined
    if (group) follows[`${path}.${prop}`] = group
  })
}

const tupleComponent = (component, path, follows) => mapChildren(component, (part, section) => {
  const at = `${path}.${section}`
  if (section === 'base') {
    followsOf(part, at, follows)
    return tupleTree(part)
  }
  if (section === 'platforms') return mapChildren(part, (props) => tupleTree(props))
  if (section === 'slots') return mapChildren(part, (slot) => (isNode(slot) ? slot.$value : slot))
  if (section === 'scope') return mapChildren(part, (changes) => tupleTree(changes))
  if (!VARIANT_SECTIONS.includes(section)) return tupleTree(part)
  return mapChildren(part, (variant, name) => mapChildren(variant, (prop, key) => {
    if (key === 'states') return mapChildren(prop, (props) => tupleTree(props))
    followsOf({ [key]: prop }, `${at}.${name}`, follows)
    return tupleOf(prop)
  }))
})

/** The `derive` of each node under a group, by its path from `path` (NodeCompiler::derivations()). */
const derivationsOf = (group, path, rules = {}) => {
  children(group).forEach((key) => {
    const node = group[key]
    if (!isObject(node)) return
    if (isNode(node)) {
      const rule = engineOf(node).derive
      if (isObject(rule)) rules[`${path}.${key}`] = rule
    } else {
      derivationsOf(node, `${path}.${key}`, rules)
    }
  })
  return rules
}

const tupleCache = new WeakMap()

/**
 * A schema in nodes as the tuples the build bundles, like api-core's
 * NodeCompiler: every node its tuple, the
 * components' `inherits` in a root `inherits` block, and what follows
 * Identity in `follows` (`{ 'components.<c>.<part>….<prop>': 'shadow' |
 * 'radius' | 'border' }`, from the nodes' `co.ordering.follows`), and the
 * rules that derive values (`co.ordering.derive` and `matrix`): `derive`
 * (`{ color: rule }`, the color tokens'), `component_derive`
 * (`{ component: { 'variants.<v>….<prop>': rule } }`) and `matrix`
 * (`{ component: matrix }`), each only when the schema declares one. A
 * schema already in tuples is returned as it is.
 */
export const tupleSchema = (schema) => {
  if (!readIsNodes(schema)) return schema
  if (tupleCache.has(schema)) return tupleCache.get(schema)
  const tuples = {}
  ;['product_type', 'version', 'format'].forEach((key) => {
    if (key in schema) tuples[key] = schema[key]
  })
  tuples.tokens = mapChildren(schema.tokens, (group) => mapChildren(group, (token) => (isNode(token) ? token.$value : token)))
  const follows = {}
  const inherits = {}
  tuples.components = mapChildren(schema.components, (component, name) => {
    const parent = engineOf(component).inherits
    if (parent) inherits[name] = parent
    return tupleComponent(component, `components.${name}`, follows)
  })
  if (Object.keys(inherits).length) tuples.inherits = inherits
  // a key a platform shows otherwise: api-core's tuple, without the v1 path
  tuples.visibility = mapChildren(schema.visibility, (node) => {
    if (!isNode(node)) return node
    const { platforms } = engineOf(node)
    return isObject(platforms) ? [node.$value, null, platforms] : node.$value
  })
  tuples.images = mapChildren(schema.images, (node) => {
    if (!isNode(node)) return node
    const own = engineOf(node)
    return [node.$value, own.formats ?? null, own.hints ?? {}]
  })
  tuples.pages = mapChildren(schema.pages, (page) => tupleTree(page))
  if ('platforms' in schema) tuples.platforms = schema.platforms
  if (isObject(schema.site)) tuples.site = tupleTree(schema.site)
  tuples.follows = follows
  const derive = {}
  children(schema.tokens?.color).forEach((color) => {
    const rule = engineOf(schema.tokens.color[color]).derive
    if (isObject(rule)) derive[color] = rule
  })
  if (Object.keys(derive).length) tuples.derive = derive
  const componentDerive = {}
  const matrix = {}
  children(schema.components).forEach((name) => {
    const component = schema.components[name]
    if (!isObject(component)) return
    if (isObject(engineOf(component).matrix)) matrix[name] = engineOf(component).matrix
    const rules = derivationsOf(component.variants, 'variants')
    if (Object.keys(rules).length) componentDerive[name] = rules
  })
  if (Object.keys(componentDerive).length || Object.keys(matrix).length) {
    tuples.component_derive = componentDerive
    tuples.matrix = matrix
  }
  tupleCache.set(schema, tuples)
  return tuples
}
