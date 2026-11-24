import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  isNodeSchema,
  schemaDefault,
  schemaEntry,
  schemaInherits,
  schemaKeys,
  schemaOptions
} from '../themeSchema'
import { kindOfType, pathSegments, readEntry, tupleSchema } from '../themeSchemaReader'
import COMPILED from '../../theme.compiled.json'
import FULL_SCHEMA from '../../../product.schema.json'

// The same small schema in both formats (api-core docs/THEMES_V2_SCHEMA_FORMAT.md).
const NODES = {
  $schema: 'urn:ordering:theme-schema:1',
  product_type: 'demo',
  version: '1.0',
  format: 2,
  platforms: ['mobile_web'],
  editor: { sections: [{ key: 'colors' }] },
  tokens: {
    color: {
      $type: 'color',
      primary: { $value: '#2C7BE5', $extensions: { 'co.ordering.editor': { control: 'color' } } }
    },
    typography: { $type: 'typography', body: { $value: { size: 14, line: 1.71, weight: 400 } } },
    motion: { $type: 'duration', fast: { $value: 120 } },
    border_style: {
      radius: { $type: 'option', $value: 'md', $extensions: { 'co.ordering': { options: ['none', 'md'] } } }
    }
  },
  components: {
    card: {
      base: {
        radius: { $type: 'dimension', $value: '{radius.md}', $extensions: { 'co.ordering': { scale: 'radius', follows: 'radius' } } },
        padding: { $type: 'dimension', $value: '{space.md}', $extensions: { 'co.ordering': { scale: 'space' } } },
        speed: { $type: 'duration', $value: '{motion.fast}' },
        title: { $type: 'typography', $value: '{typography.body}' },
        title_role: { $type: 'fontRole', $value: 'heading' },
        animated: { $type: 'boolean', $value: false },
        gap: { $type: 'dimension', $value: 8 },
        layout: { $type: 'layout', $value: 'list', $extensions: { 'co.ordering': { options: ['list', 'grid'] } } }
      },
      variants: {
        default: {
          shadow: { $type: 'shadow', $value: '{shadow.sm}', $extensions: { 'co.ordering': { follows: 'shadow' } } },
          states: { hover: { shadow: { $type: 'shadow', $value: '{shadow.md}' } } }
        }
      },
      scope: { button: {} },
      platforms: { mobile_web: { radius: { $type: 'dimension', $value: '{radius.none}', $extensions: { 'co.ordering': { scale: 'radius' } } } } }
    },
    offer_card: {
      $extensions: { 'co.ordering': { inherits: 'card' } },
      base: { color: { $type: 'role', $value: '{main}' } },
      slots: { action: { $type: 'slot', $value: { component: 'button', size: 'md' } } }
    }
  },
  visibility: {
    $type: 'boolean',
    footer: { $value: true },
    'business.header.info': { $value: false }
  },
  images: {
    $type: 'image',
    logotype: { $value: '', $extensions: { 'co.ordering': { formats: ['png', 'svg'], hints: { size: [600, 180] } } } }
  },
  pages: {
    home: {
      footer: { $type: 'boolean', $value: null },
      sections: { $type: 'sections', $value: [{ key: 'hero', visible: true, hideable: false, group: null }] }
    }
  },
  site: {
    mode: { $type: 'option', $value: 'marketplace', $extensions: { 'co.ordering': { options: ['marketplace', 'single_store'] } } },
    franchise_id: { $type: 'id', $value: null },
    third_party_code: { head: { $type: 'html', $value: '' } }
  }
}

const TUPLES = {
  product_type: 'demo',
  version: '1.0',
  format: 2,
  tokens: {
    color: { primary: '#2C7BE5' },
    typography: { body: { size: 14, line: 1.71, weight: 400 } },
    motion: { fast: 120 },
    border_style: { radius: 'md' }
  },
  components: {
    card: {
      base: {
        radius: ['radius', '{radius.md}'],
        padding: ['space', '{space.md}'],
        speed: ['motion', '{motion.fast}'],
        title: ['text', '{typography.body}'],
        title_role: ['font_role', 'heading'],
        animated: ['bool', false],
        gap: ['dimension', 8],
        layout: ['layout', 'list', ['list', 'grid']]
      },
      variants: {
        default: {
          shadow: ['shadow', '{shadow.sm}'],
          states: { hover: { shadow: ['shadow', '{shadow.md}'] } }
        }
      },
      scope: { button: {} },
      platforms: { mobile_web: { radius: ['radius', '{radius.none}'] } }
    },
    offer_card: {
      base: { color: ['role', '{main}'] },
      slots: { action: { component: 'button', size: 'md' } }
    }
  },
  inherits: { offer_card: 'card' },
  visibility: { footer: true, 'business.header.info': false },
  images: { logotype: ['', ['png', 'svg'], { size: [600, 180] }] },
  pages: {
    home: {
      footer: ['bool', null],
      sections: ['sections', [{ key: 'hero', visible: true, hideable: false, group: null }]]
    }
  },
  platforms: ['mobile_web'],
  site: {
    mode: ['option', 'marketplace', ['marketplace', 'single_store']],
    franchise_id: ['id', null],
    third_party_code: { head: ['html', ''] }
  }
}

const PATHS = [
  'components.card.base.radius',
  'components.card.base.padding',
  'components.card.base.speed',
  'components.card.base.title',
  'components.card.base.title_role',
  'components.card.base.animated',
  'components.card.base.gap',
  'components.card.base.layout',
  'components.card.variants.default.shadow',
  'components.card.variants.default.states.hover.shadow',
  'components.card.platforms.mobile_web.radius',
  'components.offer_card.base.color',
  'components.offer_card.slots.action',
  'visibility.footer',
  'visibility.business.header.info',
  'images.logotype',
  'pages.home.footer',
  'pages.home.sections',
  'site.mode',
  'site.franchise_id',
  'site.third_party_code.head'
]

const withoutFollows = (entry) => entry && { ...entry, follows: undefined }

describe('themeSchemaReader: both formats', () => {
  it('tells nodes from tuples, also for a part of a schema', () => {
    expect(isNodeSchema(NODES)).toBe(true)
    expect(isNodeSchema(TUPLES)).toBe(false)
    expect(isNodeSchema({ pages: NODES.pages })).toBe(true)
    expect(isNodeSchema({ pages: TUPLES.pages })).toBe(false)
    expect(isNodeSchema({ $schema: 'urn:other', pages: NODES.pages })).toBe(false)
    expect(isNodeSchema(null)).toBe(false)
  })

  it('gives the same entry in both formats', () => {
    PATHS.forEach((path) => {
      expect(withoutFollows(schemaEntry(path, NODES)), path).toEqual(schemaEntry(path, TUPLES))
      expect(schemaEntry(path, TUPLES), path).toBeDefined()
    })
  })

  it('normalizes the node types to the tuple kinds', () => {
    expect(schemaEntry('components.card.base.radius', NODES).type).toBe('radius')
    expect(schemaEntry('components.card.base.padding', NODES).type).toBe('space')
    expect(schemaEntry('components.card.base.speed', NODES).type).toBe('motion')
    expect(schemaEntry('components.card.base.title', NODES).type).toBe('text')
    expect(schemaEntry('components.card.base.title_role', NODES).type).toBe('font_role')
    expect(schemaEntry('components.card.base.animated', NODES).type).toBe('bool')
    expect(schemaEntry('components.card.base.gap', NODES).type).toBe('dimension')
    expect(kindOfType('slot')).toBe('slot')
    expect(kindOfType('font')).toBe('font')
    expect(kindOfType(undefined)).toBeUndefined()
  })

  it('takes the type of the group when the node has none', () => {
    expect(schemaEntry('visibility.footer', NODES).type).toBe('bool')
    expect(schemaEntry('images.logotype', NODES).type).toBe('image')
    expect(schemaEntry('tokens.color.primary', NODES)).toMatchObject({ type: 'color', value: '#2C7BE5' })
    expect(schemaEntry('tokens.motion.fast', NODES)).toMatchObject({ type: 'motion', value: 120 })
  })

  it('tokens: plain values in tuples (no type), nodes in nodes', () => {
    expect(schemaEntry('tokens.color.primary', TUPLES)).toMatchObject({ type: undefined, value: '#2C7BE5' })
    expect(schemaDefault('tokens.typography.body', TUPLES)).toEqual(schemaDefault('tokens.typography.body', NODES))
    expect(schemaOptions('tokens.border_style.radius', NODES)).toEqual(['none', 'md'])
  })

  it('reads options, formats, hints and follows', () => {
    expect(schemaOptions('site.mode', NODES)).toEqual(['marketplace', 'single_store'])
    expect(schemaOptions('site.mode', TUPLES)).toEqual(['marketplace', 'single_store'])
    expect(schemaOptions('components.card.base.radius', NODES)).toBeUndefined()
    expect(schemaEntry('images.logotype', NODES)).toMatchObject({ formats: ['png', 'svg'], hints: { size: [600, 180] } })
    expect(schemaEntry('components.card.base.radius', NODES).follows).toBe('radius')
    expect(schemaEntry('components.card.base.padding', NODES).follows).toBeUndefined()
  })

  it('a dotted key of visibility and images is one key; paths may be arrays', () => {
    expect(pathSegments('visibility.business.header.info')).toEqual(['visibility', 'business.header.info'])
    expect(pathSegments(['visibility', 'business.header.info'])).toEqual(['visibility', 'business.header.info'])
    expect(pathSegments('components.card.base')).toEqual(['components', 'card', 'base'])
    expect(schemaDefault(['visibility', 'business.header.info'], NODES)).toBe(false)
    expect(schemaDefault('visibility.business.header.info', TUPLES)).toBe(false)
  })

  it('a visibility key a platform shows otherwise: its platforms in the entry, api-core\'s tuple [default, null, platforms]', () => {
    const nodes = {
      $schema: 'urn:ordering:theme-schema:1',
      platforms: ['mobile_web'],
      visibility: {
        $type: 'boolean',
        footer: { $value: true },
        'business.header.logo': { $value: true, $extensions: { 'co.ordering': { platforms: { mobile_web: false } } } }
      }
    }
    const tuples = tupleSchema(nodes)
    expect(tuples.visibility).toEqual({ footer: true, 'business.header.logo': [true, null, { mobile_web: false }] })
    ;[nodes, tuples].forEach((schema) => {
      expect(schemaEntry('visibility.business.header.logo', schema)).toMatchObject({ type: 'bool', value: true, platforms: { mobile_web: false } })
      expect(schemaEntry('visibility.footer', schema).platforms).toBeUndefined()
    })
    // api-core's compiled tuple, with its version 1 path
    expect(schemaEntry('visibility.a', { visibility: { a: [false, 'x.hidden', { mobile_web: true }] } })).toMatchObject({ type: 'bool', value: false, platforms: { mobile_web: true } })
  })

  it('a group, a $ key or a missing path is no entry', () => {
    ;[NODES, TUPLES].forEach((schema) => {
      expect(schemaEntry('components.card.base', schema)).toBeUndefined()
      expect(schemaEntry('components.card.base.nope', schema)).toBeUndefined()
      expect(schemaEntry('visibility.nope', schema)).toBeUndefined()
      expect(schemaEntry('', schema)).toBeUndefined()
      expect(schemaDefault('nope.at.all', schema)).toBeUndefined()
    })
    expect(schemaEntry('tokens.color.$type', NODES)).toBeUndefined()
    expect(schemaEntry('components.card.base.radius.$value', NODES)).toBeUndefined()
  })

  it('lists the names of a group in the file\'s order, without $ keys', () => {
    ;[NODES, TUPLES].forEach((schema) => {
      expect(schemaKeys('components.card.base', schema)).toEqual(['radius', 'padding', 'speed', 'title', 'title_role', 'animated', 'gap', 'layout'])
      expect(schemaKeys('visibility', schema)).toEqual(['footer', 'business.header.info'])
      expect(schemaKeys('components.card.scope.button', schema)).toEqual([])
      expect(schemaKeys('components.card.base.radius', schema)).toEqual([])
      expect(schemaKeys('components.nope', schema)).toEqual([])
    })
    expect(schemaKeys('components', NODES)).toEqual(['card', 'offer_card'])
    expect(schemaKeys('tokens.color', NODES)).toEqual(['primary'])
  })

  it('reads what a component inherits', () => {
    expect(schemaInherits('offer_card', NODES)).toBe('card')
    expect(schemaInherits('offer_card', TUPLES)).toBe('card')
    expect(schemaInherits('card', NODES)).toBeUndefined()
    expect(schemaInherits('card', TUPLES)).toBeUndefined()
  })

  it('tupleSchema: the nodes as the tuples, with inherits and follows', () => {
    const tuples = tupleSchema(NODES)
    const { follows, ...rest } = tuples
    expect(rest).toEqual(TUPLES)
    expect(follows).toEqual({
      'components.card.base.radius': 'radius',
      'components.card.variants.default.shadow': 'shadow'
    })
    expect(tupleSchema(TUPLES)).toBe(TUPLES)
    expect(tupleSchema(NODES)).toBe(tuples)
  })
})

// Every node of a block of the real schema, as a path.
const nodePaths = (node, path, out = []) => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return out
  if ('$value' in node) {
    out.push(path)
    return out
  }
  Object.keys(node).filter((key) => !key.startsWith('$')).forEach((key) => nodePaths(node[key], [...path, key], out))
  return out
}

describe('themeSchema: the repo\'s schema', () => {
  it('is in nodes, and the helpers read it by default', () => {
    expect(isNodeSchema()).toBe(true)
    expect(schemaDefault('site.mode')).toBe('marketplace')
    expect(schemaOptions('site.mode')).toEqual(['marketplace', 'single_store', 'franchise'])
    expect(schemaEntry('pages.home.footer')).toMatchObject({ type: 'bool', value: null })
    expect(schemaEntry('pages.home.sections').type).toBe('sections')
    expect(schemaEntry('visibility.footer')).toMatchObject({ type: 'bool', value: true })
    expect(schemaEntry('images.logotype')).toMatchObject({ type: 'image', value: '' })
    expect(schemaEntry('images.logotype').formats).toContain('svg')
    // the favicon only in the formats every browser shows in its tab (iconLinks types them)
    expect(schemaEntry('images.favicon').formats).toEqual(['png', 'svg', 'ico'])
    expect(schemaEntry('components.button.base.radius')).toMatchObject({ type: 'radius', value: '{radius.md}', follows: 'radius' })
    expect(schemaKeys('components.signup_page.base').length).toBeGreaterThan(0)
    expect(schemaInherits('business_card')).toBe('card')
  })

  it('every node is read with a type of the tuples, the same as its tuple (what the build bundles)', () => {
    const tuples = tupleSchema(SCHEMA)
    const kinds = new Set(['color', 'role', 'radius', 'size', 'icon', 'space', 'motion', 'opacity', 'number', 'text', 'font_role',
      'border', 'shadow', 'image', 'bool', 'option', 'layout', 'sections', 'string', 'html', 'id', 'slot', 'font', 'dimension'])
    ;['components', 'visibility', 'images', 'pages', 'site', 'tokens'].forEach((block) => {
      const paths = nodePaths(SCHEMA[block], [block])
      expect(paths.length, block).toBeGreaterThan(0)
      paths.forEach((path) => {
        const entry = readEntry(SCHEMA, path)
        expect(kinds.has(entry.type), `${path.join('.')}: ${entry.type}`).toBe(true)
        const tuple = readEntry(tuples, path)
        expect(tuple?.value, path.join('.')).toEqual(entry.value)
        if (block !== 'tokens') {
          expect(tuple.type, path.join('.')).toBe(entry.type)
          expect(tuple.options, path.join('.')).toEqual(entry.options)
        }
      })
    })
  })
})

describe('themeSchema: the background colors', () => {
  const color = SCHEMA.tokens.color
  const editor = (key) => color[key].$extensions['co.ordering.editor']

  it('the surfaces group has no raised surface (a menu is of the surface)', () => {
    const group = SCHEMA.editor.sections.flatMap((section) => section.groups || []).find((g) => g.key === 'surfaces')
    expect(group.paths).toEqual([
      'tokens.color.background', 'tokens.color.surface', 'tokens.color.surface_alt',
      'tokens.color.inverse_surface', 'tokens.color.on_inverse'
    ])
    expect(color.surface_raised).toBeUndefined()
    expect(schemaOptions('tokens.focus_ring.color')).not.toContain('surface_raised')
    expect(schemaDefault('components.menu.base.background')).toBe('{color.surface}')
  })

  it('on_overlay is the text on images, not paired with the overlay behind windows', () => {
    expect(editor('on_overlay').label).toEqual({ key: 'BUILDER_THEME_COLOR_ON_OVERLAY', default: 'Text on images' })
    expect(editor('on_overlay').pair).toBeUndefined()
  })
})

describe('themeSchema: Screen designs', () => {
  const { components } = COMPILED.values
  const section = SCHEMA.editor.sections.find((item) => item.key === 'screens')

  it('defines the effective website defaults in schema 1.8.0', () => {
    expect(COMPILED.version).toBe('1.8.0')
    expect(components.product_modal.base.layout.$value).toBe('card')
    expect(components.product_modal.base.missing_choices.$value).toBe('jump')
    expect(components.header.base.scroll_behavior.$value).toBe('fixed')
    expect(components.account_invite.base.flow.$value).toBe('signup_form')
    expect(components.business_listing_page.base.layout.$value).toBe('grid')
    expect(components.business_listing_page.base.closed_stores.$value).toBe('last')
    expect(components.business_listing_page.base.filters.$value).toBe('inline')
    expect(schemaDefault('components.business_listing_page.base.showcase_featured_badge')).toBe(true)
    // implementation notesthe store page's fourth design, after the three of 1.6.0, each card of the editor drawn
    expect(components.store_page.base.template.$value).toBe('menu_index')
    expect(schemaOptions('components.store_page.base.template')).toEqual(['menu_index', 'classic', 'showcase', 'menu_index_no_cart'])
    const cards = FULL_SCHEMA.components.store_page.base.template.$extensions['co.ordering.editor'].options
    expect(cards.map((card) => card.value)).toEqual(schemaOptions('components.store_page.base.template'))
    expect(cards.at(-1)).toMatchObject({ drawing: 'StorePage:menu_index_no_cart', label: { default: 'Direct menu, no cart column' } })
  })

  it('has its editor section under Website, with five groups of paths and none of components', () => {
    expect(section.parent).toBe('website')
    expect(section.groups.map((group) => [group.key, group.paths])).toEqual([
      ['product_modal', ['components.product_modal.base.layout', 'components.product_modal.base.missing_choices']],
      ['header', ['components.header.base.scroll_behavior']],
      ['account_invite', ['components.account_invite.base.flow']],
      ['business_listing', [
        'components.business_listing_page.base.layout',
        'components.business_listing_page.base.closed_stores',
        'components.business_listing_page.base.filters',
        'components.business_listing_page.base.showcase_featured_badge'
      ]],
      ['store_page', ['components.store_page.base.template']]
    ])
    section.groups.forEach((group) => expect(group.components).toBeUndefined())
  })
})
