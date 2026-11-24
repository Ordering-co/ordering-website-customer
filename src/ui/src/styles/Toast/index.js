import React, { useEffect, useRef } from 'react'
import styled, { ThemeProvider, useTheme } from 'styled-components'
import { useToast, ToastType } from '~components/contexts/ToastContext'
import { pageGutter, themePart, themeSpace, themeValue } from '~/utils/themeTokens'
import { motionEasing, motionMs } from '~/utils/themeMotion'
import { getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { bottomNavHeight } from '~ui/src/components/NavigationBar/styles'

// The header's height on the root (Header/styles HEADER_HEIGHT_VAR, not
// imported: the header's styles are not part of the toast)
const HEADER_HEIGHT_VAR = '--header-height'

const ToastBar = styled.div`
  visibility: hidden;
  opacity: 0;
  background-color: ${({ backgroundColor }) => backgroundColor};
  color: ${({ textColor }) => textColor};
  text-align: center;
  position: fixed;
  z-index: 99999;
  /* where it sits and how wide it grows (toastPlacementCss) */
  ${props => toastPlacementCss(props.theme)}

  /* Animations to fade the snackbar in and out */
  @-webkit-keyframes fadein {
    from {opacity: 0; transform: translateY(${({ theme }) => themeSpace(theme, 'xl')});}
    to {opacity: 1; transform: translateY(0);}
  }

  @keyframes fadein {
    from {opacity: 0; transform: translateY(${({ theme }) => themeSpace(theme, 'xl')});}
    to {opacity: 1; transform: translateY(0);}
  }

  @-webkit-keyframes fadeout {
    from {opacity: 1; transform: translateY(0);}
    to {opacity: 0; transform: translateY(${({ theme }) => themeSpace(theme, 'xl')});}
  }

  @keyframes fadeout {
    from {opacity: 1; transform: translateY(0);}
    to {opacity: 0; transform: translateY(${({ theme }) => themeSpace(theme, 'xl')});}
  }

  /* a toast at the top (toast.base.position): it comes down */
  @keyframes toast-fadein-top {
    from {opacity: 0; transform: translateY(calc(-1 * ${({ theme }) => themeSpace(theme, 'xl')}));}
    to {opacity: 1; transform: translateY(0);}
  }

  @keyframes toast-fadeout-top {
    from {opacity: 1; transform: translateY(0);}
    to {opacity: 0; transform: translateY(calc(-1 * ${({ theme }) => themeSpace(theme, 'xl')}));}
  }

  /* components.toast (the background and text color per type come from
     its variants) */
  ${props => themePart(props.theme, 'toast', { 'border-radius': 'base.radius', text: 'base.text', 'box-shadow': 'base.shadow' })}
  /* its padding (components.toast.base.padding) */
  ${props => toastPaddingCss(props.theme)}
`

// components.toast.base: its values and its view (CSS)
const toastBase = (theme) => theme.values.components.toast.base
const toastLook = (theme) => getThemeCss(theme, 'toast').base

/**
 * The padding of the toast (`components.toast.base.padding`), as a declaration.
 */
export const toastPaddingCss = (theme) => `padding: ${toastLook(theme).padding};`

/**
 * Where the toast sits (`components.toast.base.position`): `bottom` (centered
 * at the bottom, as always), `top` (centered under the header) or
 * `bottom_start` (at the bottom, on the side the text starts).
 */
export const toastPosition = (theme) => toastBase(theme).position

/**
 * Where the toast sits and how wide it grows, as CSS.
 * - `components.toast.base.offset` off the edge of
 *   its position (`toastPosition`): at the bottom, above the bottom navigation
 *   where there is one (below 576px: its real height, bottomNavHeight, 0 when
 *   the theme hides it) and above the screen's bottom from 576px; at the top,
 *   under the header (its height, HEADER_HEIGHT_VAR, 0 without one);
 *   `bottom_start`, as far from the start side (the page's side space below
 *   576px);
 * - as wide as its text, up to `components.toast.base.max_width` and never
 *   wider than the page minus its side space (tokens.layout.page_gutter).
 */
export const toastPlacementCss = (theme) => {
  const look = toastLook(theme)
  // (a number: the bottom navigation's height is added to it)
  const offset = toastBase(theme).offset
  const gutter = pageGutter(theme)
  const maxWidth = `min(${look.max_width}, calc(100vw - ${2 * gutter}px))`
  const size = `
    min-width: 0;
    max-width: ${maxWidth};
    box-sizing: border-box;
  `
  const position = toastPosition(theme)
  if (position === 'top') {
    return `
      top: calc(var(${HEADER_HEIGHT_VAR}, 0px) + ${look.offset});
      bottom: auto;
      ${size}
    `
  }
  return `
    bottom: ${bottomNavHeight(theme) + offset}px;
    ${position === 'bottom_start' ? `inset-inline-start: ${gutter}px;` : ''}
    ${size}

    @media (min-width: ${MOBILE_WEB_MAX_WIDTH}px) {
      bottom: ${look.offset};
      ${position === 'bottom_start' ? `inset-inline-start: ${look.offset};` : ''}
    }
  `
}

// The keyframes of the toast's fade in and out at its position
export const toastKeyframes = (theme) => toastPosition(theme) === 'top'
  ? ['toast-fadein-top', 'toast-fadeout-top']
  : ['fadein', 'fadeout']

// The variant of components.toast of each toast type.
const VARIANT = { [ToastType.Info]: 'info', [ToastType.Success]: 'success', [ToastType.Error]: 'error' }

/**
 * The background and text color of a toast of `type`: its variant's
 * (`components.toast.variants.<info|success|error>`); another type is an info
 * one.
 */
export const toastColors = (theme, type) => {
  const variant = VARIANT[type] || 'info'
  return {
    backgroundColor: themeValue(theme, 'toast', `variants.${variant}.background`),
    textColor: themeValue(theme, 'toast', `variants.${variant}.color`)
  }
}

const ToastContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`

export const Toast = () => {
  const [toastConfig, { hideToast }] = useToast()
  const toastRef = useRef()

  const theme = useTheme()

  useEffect(() => {
    if (!toastConfig && !toastRef.current) {
      return
    }

    const toast = document.getElementById('toast-bar')
    if (!toast) return

    toast.style.visibility = 'visible'
    toast.style.animation = 'none'
    // It fades in and out at the theme's speed (components.toast), or shows at
    // once
    const ms = motionMs(theme, 'toast')
    toast.style.opacity = ms === 0 ? '1' : ''
    const rafId = requestAnimationFrame(() => {
      if (ms > 0) {
        const easing = motionEasing(theme)
        const [fadeIn, fadeOut] = toastKeyframes(theme)
        toast.style.animation = `${fadeIn} ${ms}ms ${easing} forwards, ${fadeOut} ${ms}ms ${easing} ${Math.max(0, (duration ?? 3000) - ms)}ms forwards`
      }
    })
    const timeoutId = setTimeout(() => {
      toast.style.visibility = 'hidden'
      hideToast()
    }, duration)
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
    }
  }, [toastConfig])

  if (!toastConfig) {
    return null
  }

  const { type, message, duration } = toastConfig

  const { backgroundColor, textColor } = toastColors(theme, type)

  return (
    <ToastContainer>
      <ToastBar
        backgroundColor={backgroundColor}
        textColor={textColor}
        id='toast-bar'
        ref={toastRef}
        role={type === ToastType.Error ? 'alert' : 'status'}
        aria-live={type === ToastType.Error ? 'assertive' : 'polite'}
      >
        {message}
      </ToastBar>
    </ToastContainer>
  )
}

/**
 * The app's toast under the app's theme (App.js passes the one it builds from
 * the remote theme): the theme gives it its colors, status tokens,
 * components.toast and motion; without one it keeps the theme around it (the
 * boot one). App.js renders it outside its boot gate,
 * so a toast shown while the app boots or fails early still appears.
 */
export const AppToast = ({ theme }) => (
  <ThemeProvider theme={(outer) => theme || outer}>
    <Toast />
  </ThemeProvider>
)
