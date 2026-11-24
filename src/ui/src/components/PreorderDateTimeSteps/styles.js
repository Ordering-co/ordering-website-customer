import styled, { css } from 'styled-components'
import { themeColor, primaryText } from '~/utils/themeColors'
import { themeOpacity, themePart, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { motionCss } from '~/utils/themeMotion'
import { focusRingReach, focusRingRoomXCss } from '~ui/src/styles/Focus'
import { stepMarkerCss } from '~ui/src/styles/Steps'
import { dateStripNameCss, dateStripNumberCss } from '~ui/src/styles/Calendar'

export const StepsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

export const AccordionStep = styled.div`
  overflow: hidden;

  ${({ isLocked }) => isLocked && css`
    opacity: ${props => themeOpacity(props.theme, 'disabled')};
    pointer-events: none;
  `}
  /* each step is a content container (components.card) */
  ${({ theme }) => themePart(theme, 'card', { background: 'base.background', border: 'base.border', 'border-radius': 'base.radius', 'box-shadow': 'base.shadow' })}
`

export const StepBadge = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  /* the marker of components.steps (md) in its state */
  ${({ completed, active, theme }) => stepMarkerCss(theme, { state: stepState(completed, active), size: 'md' })}
`

// The state of components.steps of a step: done, open, or still to come
export const stepState = (completed, active) => completed ? 'complete' : (active ? 'active' : 'idle')

export const HeaderText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};
`

export const StepTitle = styled.span`
  ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
  color: ${props => themeColor(props.theme, 'text')};
`

export const StepSubtitle = styled.span`
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
`

export const StepSelectedValue = styled.span`
  ${props => themeText(props.theme, 'label', { props: ['size', 'weight', 'line'], weight: 600 })}
  /* this row's background is transparent (the page's) collapsed, primary_subtle
     expanded: primary_text is legible on both by the theme's own rule */
  color: ${props => themeColor(props.theme, 'primary_text')};
`

export const AccordionBody = styled.div`
  /* When expanded, render the full content (no inner scroll, no max-height clip)
     so the surrounding modal Container is the SINGLE scroll region — avoids the
     double scrollbar, and the already-sticky Save stays reachable ().
     Collapsed it clips to 0 for the open/close transition. */
  overflow: ${({ isExpanded }) => isExpanded ? 'visible' : 'hidden'};
  max-height: ${({ isExpanded }) => isExpanded ? 'none' : '0'};
  opacity: ${({ isExpanded }) => isExpanded ? 1 : 0};
  /* as components.accordion (animated / speed), else at once */
  ${props => motionCss(props.theme, 'accordion', ['opacity'])}
`

export const AccordionBodyInner = styled.div`
  padding: ${({ theme }) => `${themeSpace(theme, 'md')} ${themeSpace(theme, 'lg')} ${themeSpace(theme, 'lg')}`};
`

export const StepHint = styled.p`
  margin: 0;
  padding: ${({ theme }) => `${themeSpace(theme, 'md')} ${themeSpace(theme, 'lg')}`};
  ${props => themeText(props.theme, 'body', { props: ['size', 'line'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
  background: ${props => themeColor(props.theme, 'surface_alt')};
  border-radius: ${props => themeRadius(props.theme, 'md')};
  text-align: center;
`

export const TimeGrid = styled.div`
  /* Two columns per row (), three from the repo's desktop
     breakpoint (768px, BusinessPreorder/MomentControl's own windowSize
     check) — the range keeps one line at either width (TimeGridLabel). */
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'sm')};

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

export const TimeGridLabel = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  /* Keep the range ("9:00 AM – 9:30 AM") on one line within a 2-column cell. */
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  white-space: nowrap;
  width: 100%;
`

/* The day strip (DayStrip, ): a horizontal, natively-scrolling
   radiogroup of days, with its prev/next buttons outside it. */

export const DayStripRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
`

// Scrolls its track natively, no visible scrollbar; focusRingRoomXCss keeps
// the first/last day's focus ring from being clipped by the overflow.
export const DayStripViewport = styled.div`
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
  ${({ theme }) => focusRingRoomXCss(theme)}
  /* Keep the scrolling area inside its own lane beside the arrow hit areas. */
  @media (pointer: coarse) {
    margin-inline: 0;
  }
  /* the overflow clips vertically too: room for the ring above and below */
  padding-top: ${({ theme }) => focusRingReach(theme)}px;
  padding-bottom: ${({ theme }) => focusRingReach(theme)}px;
`

export const DayStripTrack = styled.div`
  display: flex;
  width: max-content;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// A day's cell: room above the card for its floating "Today" tag (so the
// tag never sits on the card's own fill — readable whatever the day's state).
export const DayCell = styled.div`
  position: relative;
  flex: none;
  scroll-snap-align: start;
  padding-top: ${({ theme }) => themeSpace(theme, 'lg')};
`

export const DayTag = styled.span`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  text-align: center;
  pointer-events: none;
  ${props => themeText(props.theme, 'caption', { props: ['size', 'line', 'weight'], weight: 600 })}
  color: ${props => primaryText(props.theme)};
`

export const DayName = styled.span`
  ${({ theme }) => dateStripNameCss(theme)}
  &:first-letter {
    text-transform: uppercase;
  }
`

export const DayNumber = styled.span`
  ${props => themeText(props.theme, 'h3', { props: ['size', 'weight', 'line', 'family'], weight: 500 })}
  ${({ theme }) => dateStripNumberCss(theme)}
`

export const DayMonth = styled.span`
  ${props => themeText(props.theme, 'caption', { props: ['size', 'line'] })}
`

export const DayClosedLabel = styled.span`
  ${props => themeText(props.theme, 'caption', { props: ['size', 'line', 'weight'], weight: 600 })}
  color: ${props => themeColor(props.theme, 'text_muted')};
`
