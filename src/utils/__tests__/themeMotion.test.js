import { afterEach, describe, expect, it, vi } from 'vitest'
import THEME_COMPILED from '../../theme.compiled.json'
import { buildAppTheme, THEME_DEFAULTS } from '../appTheme'
import { motionAnimationCss, motionCss, motionMs, motionTiming, scrollBehavior, scrollMs, stateMotionCss, swiperSpeed, themeMotion } from '../themeMotion'
import { buildCompleteValues, buildLocalTheme, envelope } from './fixtures/themeFixtures'

const local = buildLocalTheme()

// A complete theme with the identity's motion and some components' own
const withMotion = ({ enabled = true, easing = 'ease_in_out', components = {} } = {}) => {
  const values = buildCompleteValues()
  values.tokens.motion = { fast: 120, base: 200, slow: 300 }
  values.tokens.motion_style = { enabled, easing }
  Object.entries(components).forEach(([name, base]) => {
    values.components[name] = { ...values.components[name], base: { ...values.components[name]?.base, ...base } }
  })
  return buildAppTheme(local, envelope(values))
}

const reduceMotion = (reduce) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({ matches: reduce && query.includes('reduce'), media: query }))
}

afterEach(() => {
  delete window.matchMedia
})

describe('themeMotion', () => {
  it('a component animates when the identity and its own base say so', () => {
    const theme = withMotion({ components: { sidebar_menu: { animated: true, speed: 300 }, button: { animated: false, speed: 120 } } })
    expect(themeMotion(theme, 'sidebar_menu')).toEqual({ ms: 300, easing: 'ease-in-out' })
    expect(themeMotion(theme, 'button')).toBeNull()
  })

  it('the header animates by default at the base speed (its reveal on scroll)', () => {
    expect(THEME_COMPILED.values.components.header.base.animated).toBe(true)
    expect(themeMotion(withMotion(), 'header')).toEqual({ ms: 200, easing: 'ease-in-out' })
  })

  it('the identity turns every component off', () => {
    const theme = withMotion({ enabled: false, components: { sidebar_menu: { animated: true, speed: 300 } } })
    expect(themeMotion(theme, 'sidebar_menu')).toBeNull()
  })

  it('a speed that is not a number is the default\'s; one out of its range, clamped', () => {
    const theme = withMotion({ components: { toast: { animated: true, speed: '{motion.base}' }, modal: { animated: true, speed: 99999 } } })
    expect(themeMotion(theme, 'toast').ms).toBe(THEME_DEFAULTS.components.toast.base.speed)
    expect(themeMotion(theme, 'modal').ms).toBe(THEME_COMPILED.values.components.modal.base.speed.$rule[1])
  })
})

describe('motion CSS', () => {
  it('none when it does not animate, else only without reduce motion', () => {
    const theme = withMotion({ components: { switch: { animated: true, speed: 120 }, chip: { animated: false, speed: 120 } } })
    expect(motionCss(theme, 'chip', ['color'])).toBe('transition: none;')
    const css = motionCss(theme, 'switch', ['transform', 'background-color'])
    expect(css).toContain('transition: none;')
    expect(css).toContain('@media (prefers-reduced-motion: no-preference) { transition: transform 120ms ease-in-out, background-color 120ms ease-in-out; }')
    expect(stateMotionCss(theme, 'switch')).toContain('background-color 120ms')
    expect(stateMotionCss(theme, 'switch')).not.toContain('transform')
  })

  it('an animation: none, or its keyframes at the speed', () => {
    const theme = withMotion({ components: { modal: { animated: true, speed: 200 }, menu: { animated: false, speed: 120 } } })
    expect(motionAnimationCss(theme, 'menu', 'theme-fade-in', 'both')).toBe('animation: none;')
    expect(motionAnimationCss(theme, 'modal', 'theme-fade-in', 'both')).toContain('animation: theme-fade-in 200ms ease-in-out both;')
  })
})

describe('motionTiming', () => {
  it('the speed and easing of a component that animates, 0ms and the identity\'s easing when it does not', () => {
    const theme = withMotion({ components: { switch: { animated: true, speed: 120 }, chip: { animated: false, speed: 120 } } })
    expect(motionTiming(theme, 'switch')).toEqual({ duration: '120ms', easing: 'ease-in-out' })
    expect(motionTiming(theme, 'chip')).toEqual({ duration: '0ms', easing: 'ease-in-out' })
    expect(motionTiming(withMotion({ enabled: false, components: { switch: { animated: true, speed: 120 } } }), 'switch').duration).toBe('0ms')
  })
})

describe('motion in code', () => {
  it('motionMs: the speed, 0 when it does not animate or the system reduces motion', () => {
    const theme = withMotion({ components: { modal: { animated: true, speed: 200 }, toast: { animated: false, speed: 200 } } })
    reduceMotion(false)
    expect(motionMs(theme, 'modal')).toBe(200)
    expect(motionMs(theme, 'toast')).toBe(0)
    reduceMotion(true)
    expect(motionMs(theme, 'modal')).toBe(0)
  })

  it('scrolls and carousels follow the identity and the system', () => {
    reduceMotion(false)
    const on = withMotion()
    const off = withMotion({ enabled: false })
    expect(scrollBehavior(on)).toBe('smooth')
    expect(scrollBehavior(off)).toBe('auto')
    expect(scrollMs(on)).toBe(300)
    expect(scrollMs(off)).toBe(0)
    expect(swiperSpeed(on)).toBe(200)
    expect(swiperSpeed(off)).toBe(0)
    reduceMotion(true)
    expect(scrollMs(on)).toBe(0)
    expect(swiperSpeed(on)).toBe(0)
  })

  it('a carousel of the theme (promo_carousel) slides at its own speed, at once when it does not animate', () => {
    reduceMotion(false)
    const animated = withMotion({ components: { promo_carousel: { animated: true, speed: 450 } } })
    expect(swiperSpeed(animated, 'promo_carousel')).toBe(450)
    // the schema default: animated, at its own speed
    expect(swiperSpeed(withMotion(), 'promo_carousel')).toBe(THEME_DEFAULTS.components.promo_carousel.base.speed)
    expect(swiperSpeed(withMotion({ components: { promo_carousel: { animated: false } } }), 'promo_carousel')).toBe(0)
    expect(swiperSpeed(withMotion({ enabled: false, components: { promo_carousel: { animated: true, speed: 450 } } }), 'promo_carousel')).toBe(0)
    reduceMotion(true)
    expect(swiperSpeed(animated, 'promo_carousel')).toBe(0)
  })
})

// The 15 components that animate out of the box: the schema's
// `base.animated` default is true, so a theme that sets nothing moves
const ANIMATED_BY_DEFAULT = ['button', 'input', 'menu', 'checkbox', 'radio', 'choice', 'tabs', 'chip', 'promo_carousel', 'slider', 'order_type_card', 'business_card', 'product_card', 'order_card', 'search_bar']

describe('animations on by default', () => {
  it.each(ANIMATED_BY_DEFAULT)('%s animates with the defaults', (component) => {
    const theme = withMotion()
    expect(themeMotion(theme, component)).not.toBeNull()
    expect(motionCss(theme, component, ['color'])).toContain('@media (prefers-reduced-motion: no-preference) { transition: color')
  })

  it.each(ANIMATED_BY_DEFAULT)('%s does not animate when the identity turns motion off', (component) => {
    expect(themeMotion(withMotion({ enabled: false }), component)).toBeNull()
  })

  it.each(ANIMATED_BY_DEFAULT)('%s does not animate when the system reduces motion', (component) => {
    const theme = withMotion()
    reduceMotion(false)
    expect(motionMs(theme, component)).toBeGreaterThan(0)
    reduceMotion(true)
    expect(motionMs(theme, component)).toBe(0)
  })
})
