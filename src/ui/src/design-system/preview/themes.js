import { resolve } from '@orderingco/ordering-theme-engine'
import { buildAppTheme } from '~/utils/appTheme'
import { SCHEMA } from '~/utils/themeSchema'

// Test themes for the preview, the design system's tests and the dev review
// tool. `defaults` and `typefaces` are partial v2 envelopes (the engine fills
// the rest from the schema). The three store themes look like real food
// stores (no real brand): each one sets every base color a store sets and is
// resolved with the engine, as the API serves a saved theme, so the derived
// colors (pressed, subtle, text) and every component's colors follow its
// palette. Each one also moves `components.button` and a group's `scope`, the
// two levels a token bridge does not reach: the pieces read them through
// `componentVars`.
const envelope = (values) => ({ version: 2, values })
// what each store theme sets before the engine resolves it (a test checks
// that it names every base color, which `resolve` would otherwise fill)
export const STORE_INPUTS = {}
const store = (id, values) => {
  STORE_INPUTS[id] = values
  return envelope(resolve(SCHEMA, values))
}

// The text a component names for itself (a modal's title, a button's, a field's):
// every one of another size, weight and font than the theme's headings and body,
// so a test sees whether the piece's text or the app's global rule on `h2` and
// `button` wins (it is the piece's).
const OWN_TEXT = { size: 18, line: 1.2, weight: 400, family: 'playfair_display' }

// The test stores use the stronger border on text fields and search.
const FIELD_BORDER = { width: '{border.thin}', color: '{color.border_strong}', style: 'solid' }

// The raw v2 envelopes (what the API sends as the theme): the single source of
// these fixtures, for the preview, the tests and the dev review tool
// (preview/devReview.js), which serves them as the store's own theme.
export const THEME_ENVELOPES = {
  defaults: envelope({}),
  // the default colors and shape, with its own text in the modal's title, the button and the field
  typefaces: envelope({
    tokens: { font: { heading: 'montserrat', body: 'archivo' } },
    components: {
      button: { sizes: { md: { text: { ...OWN_TEXT, weight: 500 } } } },
      modal: { base: { title: OWN_TEXT } },
      input: { base: { text: OWN_TEXT } }
    }
  }),
  // a neighbourhood café: light, deep green and butter, serif headings, pill
  // buttons that grow on a phone; the header's buttons are only rounded
  cafe: store('cafe', {
    tokens: {
      font: { heading: 'playfair_display', body: 'lato' },
      color: {
        background: '#F3F6F4',
        surface: '#FFFFFF',
        surface_alt: '#E7EEEA',
        text: '#18241F',
        text_muted: '#4F5F58',
        text_disabled: '#9AA8A1',
        border: '#D3DDD8',
        border_strong: '#6F827A',
        primary: '#1F5C4A',
        on_primary: '#FFFFFF',
        secondary: '#F2D27A',
        on_secondary: '#2A2208',
        overlay: 'rgba(24,36,31,0.5)',
        on_overlay: '#FFFFFF',
        inverse_surface: '#18241F',
        on_inverse: '#F3F6F4',
        success: '#1E7A46',
        on_success: '#FFFFFF',
        warning: '#F2B630',
        on_warning: '#1E1600',
        danger: '#B3261E',
        on_danger: '#FFFFFF',
        info: '#2B5FA8',
        on_info: '#FFFFFF',
        disabled: '#C9D3CE',
        rating: '#D99A00',
        favorite: '#C8364B'
      },
      border_style: { radius: 'full', width: 'thin', style: 'solid' },
      focus_ring: { width: 'thick', offset: 'xs', color: 'primary' }
    },
    components: {
      button: {
        base: { radius: 9999, icon_gap: 6, animated: true, speed: 260 },
        sizes: { md: { height: 52, padding_x: 28, icon_size: 22 } }
      },
      header: { scope: { button: { base: { radius: 12 }, sizes: { md: { height: 40, padding_x: 16 } } } } },
      modal: { base: { radius: 24 } },
      input: { base: { radius: 9999, border: FIELD_BORDER } },
      search_bar: { base: { border: FIELD_BORDER } },
      // A store that keeps these still (the schema animates them by default since implementation notes):
      // the reduced motion spec needs one theme that does not animate them.
      chip: { base: { animated: false } },
      tabs: { base: { animated: false } },
      choice: { base: { animated: false } },
      checkbox: { base: { animated: false } },
      radio: { base: { animated: false } }
    },
    platforms: { mobile_web: { components: { button: { sizes: { md: { height: 48, padding_x: 20 } } } } } }
  }),
  // a burger grill at night: warm charcoal, mustard and ketchup, square
  // corners; the header's buttons are pills (a scope against the theme's grain)
  grill: store('grill', {
    tokens: {
      font: { heading: 'archivo', body: 'inter' },
      color: {
        background: '#1B1513',
        surface: '#261E1B',
        surface_alt: '#322824',
        text: '#F4ECE6',
        text_muted: '#BFAFA6',
        text_disabled: '#7A6C65',
        border: '#3E332E',
        border_strong: '#8F7F77',
        primary: '#F0B429',
        on_primary: '#1B1513',
        secondary: '#C7372F',
        on_secondary: '#FFFFFF',
        overlay: 'rgba(0,0,0,0.65)',
        on_overlay: '#FFFFFF',
        inverse_surface: '#F4ECE6',
        on_inverse: '#1B1513',
        success: '#3FB56B',
        on_success: '#0E1A12',
        warning: '#F59E0B',
        on_warning: '#1B1513',
        danger: '#E5484D',
        on_danger: '#1B1513',
        info: '#4C9AFF',
        on_info: '#0B1420',
        disabled: '#4A3F3A',
        rating: '#F0B429',
        favorite: '#FF5C6C'
      },
      border_style: { radius: 'none', width: 'thin', style: 'solid' },
      focus_ring: { width: 'thick', offset: 'xxs', color: 'primary' }
    },
    components: {
      button: {
        base: { radius: 0, icon_gap: 10, animated: true, speed: 160 },
        sizes: { md: { height: 46, padding_x: 22, icon_size: 20 } }
      },
      // a ring of its own size, so a spec sees the busy button take the theme's and not the default
      spinner: { sizes: { sm: { diameter: 24, thickness: 3 } } },
      header: { scope: { button: { base: { radius: 9999 }, sizes: { md: { height: 34, padding_x: 14 } } } } },
      modal: { base: { radius: 0 } },
      input: { base: { radius: 0, border: FIELD_BORDER } },
      search_bar: { base: { border: FIELD_BORDER } }
    }
  }),
  // a fresh grocery: white, leaf green and citrus, medium corners; the
  // header's buttons are pills
  grocery: store('grocery', {
    tokens: {
      font: { heading: 'nunito', body: 'open_sans' },
      color: {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surface_alt: '#F1F6EE',
        text: '#14210F',
        text_muted: '#536150',
        text_disabled: '#A3AE9F',
        border: '#DCE5D7',
        border_strong: '#76866F',
        primary: '#2F7D32',
        on_primary: '#FFFFFF',
        secondary: '#FFB703',
        on_secondary: '#241A00',
        overlay: 'rgba(20,33,15,0.5)',
        on_overlay: '#FFFFFF',
        inverse_surface: '#14210F',
        on_inverse: '#FFFFFF',
        success: '#1F7A4D',
        on_success: '#FFFFFF',
        warning: '#FFB703',
        on_warning: '#241A00',
        danger: '#C62828',
        on_danger: '#FFFFFF',
        info: '#1565C0',
        on_info: '#FFFFFF',
        disabled: '#D3DBCF',
        rating: '#E69500',
        favorite: '#D81B60'
      },
      border_style: { radius: 'md', width: 'thin', style: 'solid' }
    },
    components: {
      button: {
        base: { radius: 10, icon_gap: 8, animated: true, speed: 200 },
        sizes: { md: { height: 48, padding_x: 20, icon_size: 20 } }
      },
      header: { scope: { button: { base: { radius: 9999 }, sizes: { md: { height: 38, padding_x: 14 } } } } }
    }
  })
}

export const THEMES = [
  {
    id: 'defaults',
    name: 'Defaults',
    theme: buildAppTheme(null, null)
  },
  { id: 'grill', name: 'Grill, dark', theme: buildAppTheme(null, THEME_ENVELOPES.grill) },
  { id: 'cafe', name: 'Café, light', theme: buildAppTheme(null, THEME_ENVELOPES.cafe) },
  {
    // the cascade fixture: the title of a modal, the button and the field name
    // their own font, size and weight, unlike the headings' and the body's
    id: 'typefaces',
    name: 'Typefaces, own text',
    theme: buildAppTheme(null, THEME_ENVELOPES.typefaces)
  },
  { id: 'grocery', name: 'Grocery, fresh', theme: buildAppTheme(null, THEME_ENVELOPES.grocery) }
]
