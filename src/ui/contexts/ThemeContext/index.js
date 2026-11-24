import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createGlobalStyle, css, ThemeProvider as ThemeProviderStyled } from 'styled-components'
import { headingsCss, themeScrollbar, themeValue } from '~/utils/themeTokens'
import { themeColor } from '~/utils/themeColors'
import { FADE_IN_KEYFRAMES, motionAnimationCss } from '~/utils/themeMotion'
import { focusRingGlobalCss } from '~ui/src/styles/Focus'
import { linkColor } from '~ui/src/styles/Link'
import { layerBackgroundCss } from '~ui/src/styles/Layer'
import { usePlatformTheme } from '~ui/hooks/useThemePlatform'
import { ThemeCssVariables } from '~ui/src/design-system/tokens/ThemeCssVariables'

/**
 * Create ThemeContext
 * Context to use theme on the app
 */
export const ThemeContext = createContext()

// A provider nested in another (the app's, with the remote theme, inside the
// boot one with the local theme) tells it so: only the innermost one sets the
// global styles, or the outer theme's would stay under the inner one's.
const NestedThemeContext = createContext(null)

/**
 * The text of the page is the body style of the theme
 * (`tokens.typography.body`): its size, and its line height, a ratio of the
 * size (unitless), so a text that sets only its own size keeps the
 * proportion.
 */
export const bodyTextCss = (theme) => {
  const body = theme.css.tokens.typography.body
  return `font-size: ${body.size}; line-height: ${body.line};`
}

// The design system's pieces (`data-slot`) paint themselves with utilities in a
// CSS layer, and any rule outside a layer beats a layer whatever its
// specificity: a global rule on a bare element (`button`, `h2`) would undo the
// theme's text of a Button, an Input or a dialog title. These rules are for the
// legacy elements only; `:where` keeps their specificity, so a legacy
// component's own rule wins over them as before.
const NOT_A_PIECE = ':where(:not([data-slot]))'
const forLegacy = (css) => css.replace(/^(h[1-6]) \{/gm, `$1${NOT_A_PIECE} {`)

/**
 * Global styles of the app. Defined once at module level (a styled component
 * created inside render is a new component every render: it unmounts and
 * re-inserts its CSS); everything it needs comes by props.
 */
const GlobalStyle = createGlobalStyle`
  /* loading placeholders (react-loading-skeleton) in the theme's colors:
     the soft line color as the block, the alternate surface as its sheen */
  ${({ theme }) => css`
    .react-loading-skeleton.react-loading-skeleton {
      --base-color: ${themeColor(theme, 'border')};
      --highlight-color: ${themeColor(theme, 'surface_alt')};
    }
  `}
  @media (min-width: 578px) {
    ${({ theme }) => css`
      /* every scrollbar is the theme's (as the menus' lists):
         tokens.scrollbar.size wide, its thumb of the strong border color
         (rounded by tokens.scrollbar.radius when the menus are) on no
         track, no horizontal one. Chrome ignores ::-webkit-scrollbar when
         scrollbar-width / -color are set: those only where it is missing. */
      ::-webkit-scrollbar {
        width: ${themeScrollbar(theme).size};
        height: 0px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: ${themeColor(theme, 'border_strong')};
        border-radius: ${themeValue(theme, 'menu', 'base.radius') > 0 ? themeScrollbar(theme).radius : '0'};
      }
      @supports not selector(::-webkit-scrollbar) {
        * {
          scrollbar-color: ${themeColor(theme, 'border_strong')} transparent;
          scrollbar-width: thin;
        }
      }
    `}
  }
  body {
    font-family: ${({ theme }) => theme.css.fonts.body.family};
    margin: 0;
    background-color: ${({ theme }) => themeColor(theme, 'background')};
    /* the page is the first layer (styles/Layer): what is on it, and not in a
       floating layer, is of its background */
    ${({ theme }) => layerBackgroundCss(themeColor(theme, 'background'))}
    color: ${({ theme }) => themeColor(theme, 'text')};
    direction: ${({ theme }) => theme.rtl ? 'rtl' : 'ltr'};
    -webkit-overflow-scrolling: auto;
    ${({ theme }) => bodyTextCss(theme)}
  }
  input${NOT_A_PIECE}, textarea${NOT_A_PIECE}, button${NOT_A_PIECE} {
    font-family: inherit;
  }
  /* every heading has the typography of its level (h5 / h6: h4) */
  ${({ theme }) => forLegacy(headingsCss(theme))}
  /* a link without a color of its own is of the theme's links
     (components.link, else the primary as text; no class: any screen's rule
     wins; a piece made a link keeps its own color), and every control shows
     the theme's focus ring on keyboard focus */
  ${({ theme }) => css`
    :where(a)${NOT_A_PIECE}, :where(a:visited)${NOT_A_PIECE} {
      color: ${linkColor(theme)};
    }
    ${focusRingGlobalCss(theme)}
  `}
  /* the overlay of a modal is the theme's (components.modal overlay), once:
     the root behind every modal stays clear and each modal dims what is under
     it (a modal over another dims that one too) */
  .popup-backdrop {
    background-color: transparent;
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 20002;
  }
  .popup-component {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  /* the overlay is a layer of its own behind the modal's box, in the same fade
     (opacity, on the compositor like the box's: a color animation runs on the
     main thread and starts a frame late when it is busy); the .popup-component
     itself never fades, or the box would fade twice */
  .popup-component::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
    pointer-events: none;
    background-color: ${({ theme }) => themeValue(theme, 'modal', 'base.overlay')};
    ${({ theme }) => motionAnimationCss(theme, 'modal', FADE_IN_KEYFRAMES, 'both')}
  }
  /* what opens fades in, when the theme animates it */
  @keyframes ${FADE_IN_KEYFRAMES} {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

/**
 * Api provider to manage theme
 * @param {props} props
 */
export const ThemeProvider = ({ children, theme: sourceTheme, direction }) => {
  // The theme follows the `theme` prop: when the parent passes a new one (the
  // remote theme loaded or refreshed) it replaces whatever update/merge set.
  // Synced during render (not in an effect) so no frame paints the old theme.
  const [state, setState] = useState({ source: sourceTheme, theme: sourceTheme })
  if (state.source !== sourceTheme) {
    setState({ source: sourceTheme, theme: sourceTheme })
  }
  const stateTheme = state.source !== sourceTheme ? sourceTheme : state.theme
  // The theme of the window's platform: below 576px themeVisible answers the
  // phone's value (platforms.mobile_web.visibility over visibility).
  const platformTheme = usePlatformTheme(stateTheme)
  // Direction belongs to the active language or preview selection. A newly
  // fetched theme can replace the store values while the direction stays put.
  const theme = useMemo(() => {
    if (direction == null) return platformTheme
    const rtl = direction === 'rtl'
    return platformTheme.rtl === rtl ? platformTheme : { ...platformTheme, rtl }
  }, [platformTheme, direction])

  useEffect(() => {
    if (direction == null) return
    const html = document.documentElement
    const previous = html.getAttribute('dir')
    html.dir = direction
    return () => {
      if (previous == null) html.removeAttribute('dir')
      else html.dir = previous
    }
  }, [direction])

  const registerInParent = useContext(NestedThemeContext)
  const [nestedProviders, setNestedProviders] = useState(0)
  const registerNested = useCallback((delta) => setNestedProviders((count) => count + delta), [])
  useEffect(() => {
    if (!registerInParent) return
    registerInParent(1)
    return () => registerInParent(-1)
  }, [registerInParent])

  const update = (nextTheme) => {
    setState((prev) => ({ ...prev, theme: nextTheme }))
  }

  // (a part that is not its values, such as `rtl`: a theme of other values is
  // built again, buildAppTheme, and given whole to `update`, so its CSS
  // view follows them)
  const merge = (partTheme) => {
    setState((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        ...partTheme
      }
    }))
  }

  return (
    <ThemeContext.Provider value={[theme, { update, merge }]}>
      <NestedThemeContext.Provider value={registerNested}>
        <ThemeProviderStyled theme={theme}>
          {nestedProviders === 0 && (
            <>
              <GlobalStyle />
              {/* the design system's `--ot-*` variables, on :root, so its pieces
                  paint the theme inside portals and when it changes */}
              <ThemeCssVariables />
            </>
          )}
          {children}
        </ThemeProviderStyled>
      </NestedThemeContext.Provider>
    </ThemeContext.Provider>
  )
}

/**
 * Hook to get theme state
 */
export const useTheme = () => {
  const themeManager = useContext(ThemeContext)
  return themeManager || [{}]
}
