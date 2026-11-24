import { CollapsibleHeadingButton } from '~ui/src/design-system/components/ButtonAppearances'
import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { isTransparent, themeColor, withAlpha } from '~/utils/themeColors'
import { getThemeCss } from '~/utils/themeCss'
import { scopedTheme } from '~/utils/themeGroups'
import { headingText, themeBadgeCss, themePart, themeRadius, themeSpace, themeText, themeValue } from '~/utils/themeTokens'
import { motionCss, motionMs, themeMotion } from '~/utils/themeMotion'
import { OPTION_ERROR_RESERVE, OPTION_ERROR_SPREAD } from '~ui/src/styles/Rules'
import { nestingMode, productOptionBase } from '~/utils/productOptionTheme'

const isPlain = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

// components.product_option.base as CSS (its view)
const optionCss = (theme) => getThemeCss(theme, 'product_option').base

// the pulse lasts this many times the group's speed (the CSS below and the
// timer that takes its attribute off, errorPulseMs, read the same number)
const ERROR_PULSE_FACTOR = 5.5

/**
 * the ms the pulse runs right now (0 when the theme does not animate the group
 * or the system reduces motion), for the code that sets and clears
 * `data-just-snapped`.
 */
export const errorPulseMs = (theme) => motionMs(theme, 'product_option') * ERROR_PULSE_FACTOR

// keyframes have no theme: the pulse color comes from CSS variables that
// WrapHeader sets from components.product_option's error color. The spread is the
// fixed reach of the error cue, independent of the store's spacing scale.
const errorPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 var(--error-pulse-color); }
  70%  { box-shadow: 0 0 0 ${OPTION_ERROR_SPREAD} var(--error-pulse-fade); }
  100% { box-shadow: 0 0 0 0 var(--error-pulse-fade); }
`

/**
 * whether a group is drawn as a box (a border or a background of
 * its own): its content then keeps off the edges and its error recolors the
 * border; a group without a box shows its error in its text only.
 */
export const groupIsBoxed = (base) => isPlain(base.border) || !isTransparent(base.background)

/**
 * the group (components.product_option): its background, border
 * and radius; with an error shown, the border in the `error` color (a box
 * without a border keeps the room of one, so the error does not resize it).
 */
const containerCss = ({ theme, $error }) => {
  const base = productOptionBase(theme)
  const view = optionCss(theme)
  const boxed = groupIsBoxed(base)
  // the theme's spaces: lg between the groups, xs / md inside a boxed one
  const rules = [
    `margin-top: ${themeSpace(theme, 'lg')};`,
    `border-radius: ${view.radius};`,
    isTransparent(base.background) ? '' : `background: ${base.background};`
  ]
  if (boxed) {
    rules.push(`padding: ${themeSpace(theme, 'xs')} ${themeSpace(theme, 'md')} ${themeSpace(theme, 'md')};`)
    const border = isPlain(base.border) ? view.border : `${OPTION_ERROR_RESERVE} solid transparent`
    rules.push(`border: ${border};`)
    if ($error) rules.push(`border-color: ${base.error};`)
  }
  return rules.join('\n')
}

export const Container = styled.div`
  ${containerCss}
`

// the indentation of one nesting level
export const NESTING_INDENT = 16

/**
 * an option shown because a sub-option was chosen, `$level`
 * deep (at most 2): `line` indents it with the `nesting_line` rule on its
 * side, `indent` only indents it, `none` leaves it flat.
 */
export const NestingFrame = styled.div`
  ${({ theme, $level }) => {
    if (!($level > 0)) return ''
    const mode = nestingMode(theme)
    if (mode === 'none') return ''
    const indent = $level * NESTING_INDENT
    if (mode === 'indent') return `margin-inline-start: ${indent}px;`
    const line = productOptionBase(theme).nesting_line
    const lineWidth = isPlain(line) ? (Number(line.width ?? 1) || 0) : 0
    // (the view's border, `none` without a line)
    return `
      margin-inline-start: ${indent - 12}px;
      padding-inline-start: ${12 - lineWidth}px;
      border-inline-start: ${optionCss(theme).nesting_line};
    `
  }}
`

export const WrapHeader = styled.div`
  /* the group's box spaces the groups and paints the background */
  padding: ${({ theme }) => themeSpace(theme, 'sm')} 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  /* the pulse in components.product_option's error color, as long as
     ERROR_PULSE_FACTOR times its speed, only when the theme animates it and
     the system does not reduce motion. Raised only while it runs (z-index 1:
     the options' cards come after it and, without it, would hide the ring's
     lower edge and corners) but under the form's fixed bars (the tabs and the
     steps bar, z-index 2, and the action bar), which cover the ring's upper
     edge when the group sits under them */
  --error-pulse-color: ${({ theme }) => withAlpha(errorColor(theme), 0.55)};
  --error-pulse-fade: ${({ theme }) => withAlpha(errorColor(theme), 0)};
  ${({ theme }) => themeMotion(theme, 'product_option') && css`
    [data-just-snapped='true'] > & {
      @media (prefers-reduced-motion: no-preference) {
        position: relative;
        z-index: 1;
        animation: ${errorPulse} ${themeMotion(theme, 'product_option').ms * ERROR_PULSE_FACTOR}ms ${themeMotion(theme, 'product_option').easing} 1;
      }
    }
  `}
`

const errorColor = (theme) => themeValue(theme, 'product_option', 'base.error')

export const TitleContainer = styled.div`
  flex: 1;
  min-width: 0;
  margin: 0px;
  /* white-space: normal already wraps the title fully (no cut); overflow
     and text-overflow were dead here (no line clamp, no fixed height) */
  white-space: normal;
  display: flex;
  align-items: center;
  /* the title takes the row up to the chevron; the image (when shown) keeps
     its room beside it */
  gap: ${({ theme }) => themeSpace(theme, 'md')};

  .title-container {
    display: flex;
    flex-direction: column;
  }
`

/* components.product_option's title text and color */
const titleCss = ({ theme }) => themePart(theme, 'product_option', { text: 'base.title', color: 'base.title_color' })

export const Title = styled.h3`
  ${props => headingText(props.theme, 'h3')}
  display: flex;
  flex-direction: column;
  margin: 0px;
  white-space: normal;
  span {
    &:not(:first-child) {
      color: ${props => themeColor(props.theme, 'text_muted')};
      ${props => themeText(props.theme, 'caption', { props: ['size', 'weight'], weight: 400 })}
    }
  }
  ${titleCss}
`

/* the badge and the limits under the title */
export const OptionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => `${themeSpace(theme, 'xs')} ${themeSpace(theme, 'sm')}`};
  margin-top: ${({ theme }) => themeSpace(theme, 'xs')};
`

/* the "Required" badge (the `required` slot: a badge variant) */
export const RequiredBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${themeSpace(theme, 'xxs')} ${themeSpace(theme, 'sm')}`};
  white-space: nowrap;
  ${({ theme, $variant }) => themeBadgeCss(theme, $variant || 'neutral')}
`

/* the limits ("Choose 2", "Max. 3"), neutral text in the
   description style; in the `error` color while the group shows an error */
export const OptionLimit = styled.span`
  ${({ theme, $error }) => {
    const view = optionCss(theme)
    return `${view.description.css}\ncolor: ${$error ? view.error : view.description_color};`
  }}
`

export const OptionThumbnail = styled.div`
  display: inline-block;
  background-image: url("${({ src }) => src}");
  background-repeat: no-repeat, repeat;
  background-size: cover;
  object-fit: cover;
  background-position: center;
  justify-content: center;
  align-items: center;
  /* the options' image box (image_size, image_radius) */
  ${({ theme }) => optionImageCss(theme)}
`

/**
 * the image box of the options and sub-options
 * (components.product_option `image_size` square, `image_radius`). Empty
 * otherwise.
 */
export const optionImageCss = (theme) => {
  const { image_size: size, image_radius: radius } = optionCss(theme)
  return `
    flex-shrink: 0;
    width: ${size};
    height: ${size};
    min-width: ${size};
    min-height: ${size};
    border-radius: ${radius};
  `
}

/* The group's name in its heading: a button with no box of the browser
   (it opens / closes the group), the focus ring of the theme */
export const HeaderToggle = React.forwardRef((props, ref) => (
  <CollapsibleHeadingButton {...props} ref={ref} />
))
HeaderToggle.displayName = 'HeaderToggle'

export const CollapsibleContent = styled.div`
  max-height: ${({ isCollapsed }) => isCollapsed ? '0' : 'none'};
  overflow: hidden;
  /* a step of the accordion (layout steps) that is folded takes nothing out of
     the keyboard's reach or the screen reader's: only one group is open */
  ${({ $stepped, isCollapsed }) => $stepped && isCollapsed && 'visibility: hidden;'}
  /* as components.accordion (animated / speed), else at once. The visibility of a step goes with the same
     transition: while the group folds it stays visible until the end (visibility interpolates as visible between
     visible and hidden), so the folding is seen; unfolding shows it at once */
  ${props => motionCss(props.theme, 'accordion', props.$stepped ? ['max-height', 'visibility'] : ['max-height'])}
  /* room inside the clip for the options' shadow (components.choice
     as the group sees it), which the collapse's overflow would cut;
     none while collapsed, so no edge of the options shows */
  ${({ theme, isCollapsed }) => {
    if (isCollapsed) return 'padding: 0;'
    const { top, right, bottom, left } = getThemeCss(scopedTheme(theme, 'product_option'), 'choice').base.shadow.reach
    return `padding: ${top}px ${right}px ${bottom}px ${left}px;`
  }}
`

/* What a folded step of the accordion (layout `steps`) says at the end of its
   header: what was chosen, or its Required badge or "Optional", then the
   chevron. It takes what the title leaves (the name wraps before this does). */
export const StepEnd = styled.span`
  display: inline-flex;
  flex: 0 1 auto;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  min-width: 0;
  max-width: 55%;
  margin-inline-start: ${({ theme }) => themeSpace(theme, 'md')};
  margin-inline-end: ${({ theme }) => themeSpace(theme, 'sm')};
`

export const StepSummary = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme, $muted }) => themeColor(theme, $muted ? 'text_muted' : 'text')};
  ${({ theme }) => themeText(theme, 'label')}
`

/* a required group that is done: a check in the success color */
export const StepDone = styled.span`
  display: inline-flex;
  flex: none;
  color: ${({ theme }) => themeColor(theme, 'success_text')};
`
