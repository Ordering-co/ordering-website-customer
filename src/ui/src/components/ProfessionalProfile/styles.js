import styled, { css } from 'styled-components'
import { headingText, themeSpace } from '~/utils/themeTokens'
import { dividerRules, dividerLineCss } from '~ui/src/styles/Divider'
import { modalTheme } from '~ui/src/components/Overlay/modalTheme'
import { layerBackground } from '~ui/src/styles/Layer'
import { KEYBOARD_OPEN_IN_FLOW } from '~ui/hooks/useKeyboardOpen'
import { controlMeasureCss } from '~ui/src/design-system/lib/controlMeasure'

/**
 * The sides of a professional's profile or info (a modal with
 * no padding of its own): the modal's padding (components.modal
 * base.padding, padding_top above).
 */
export const profileSides = (theme) => {
  const base = modalTheme(theme)
  return { side: base.padding, top: base.padding_top }
}

/* The profile's box; the modal's padding (its band divider
   bleeds as far) */
export const profileContainerCss = ({ theme }) => {
  const sides = profileSides(theme)
  return css`padding: ${sides.top} ${sides.side} 0px ${sides.side};`
}

/* A band divider of the profile, over the whole modal */
export const profileDividerBleedCss = ({ theme }) => {
  const sides = profileSides(theme)
  return css`
    margin-inline-start: calc(-1 * ${sides.side});
    width: calc(100% + ${sides.side} + ${sides.side});
  `
}

export const Container = styled.div`
  position: relative;
  ${profileContainerCss}
`

export const PhotoWrapper = styled.div`
  display: flex;
  justify-content: center;
`

export const NameWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};

  > h2 {
    ${props => headingText(props.theme, 'h2')}
    margin-top: ${props => themeSpace(props.theme, 'lg')};
    margin-bottom: 0px;
  }
`

export const Divider = styled.div`
  /* components.divider band; it keeps its bleed */
  ${props => dividerRules(props.theme, 'band', { inline: false })}
  ${profileDividerBleedCss}
`

export const ScheduleWrapper = styled.div`
  margin-top: ${props => themeSpace(props.theme, 'xl')};
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};

  > div {
    padding: 0px;
  }
  h3 {
    ${props => headingText(props.theme, 'h3')}
    margin-bottom: ${props => themeSpace(props.theme, 'lg')};
    margin-top: 0px;
  }
`

export const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: sticky;
  ${KEYBOARD_OPEN_IN_FLOW}
  background: ${props => layerBackground(props.theme)};
  padding: ${props => themeSpace(props.theme, 'md')} 0px;
  /* components.divider item */
  ${props => dividerLineCss(props.theme, 'item', { edge: 'top' })}
  bottom: 0px;
  z-index: 1;
`

// The slot of the Book action: the bar's width up to a measure of text (38ch, 25ch on a phone); the Button fills it
export const BookAction = styled.div`
  display: flex;
  /* the 38ch and 25ch are the Button's own characters */
  ${({ theme }) => controlMeasureCss(theme, 'button', { size: 'md' })}
  width: 100%;
  max-width: min(100%, 38ch);

  @media (max-width: 512px) {
    max-width: min(100%, 25ch);
  }
`
