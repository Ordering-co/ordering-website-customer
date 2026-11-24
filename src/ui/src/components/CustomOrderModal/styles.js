import React from 'react'
import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeControlHeight, themeIconSize, themeRadius, themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { productGutter } from '~ui/src/components/ProductForm/styles'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { fieldGap, fieldLabelGap } from '~ui/src/styles/Field'
import { Button } from '~ui/src/design-system/components/Button'
import { stepConnectorCss, stepMarkerCss } from '~ui/src/styles/Steps'

export const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  /* the side gutter of the product modal */
  padding: 0 ${props => productGutter(props.theme)} ${props => themeSpace(props.theme, 'lg')};
  /* the two steps keep one height: seven of the theme's largest control height */
  min-height: calc(7 * ${props => themeSize(props.theme, 'xl')});
`

export const StepSubtitle = styled.p`
  margin: ${props => themeSpace(props.theme, 'sm')} 0 ${props => themeSpace(props.theme, 'xl')};
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text')};
`

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  /* the space between two fields of a form (components.field gap) */
  margin-bottom: ${props => fieldGap(props.theme)};
`

export const Label = styled.label`
  ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
  /* the field's label_gap */
  margin-bottom: ${props => fieldLabelGap(props.theme)};
  color: ${props => themeColor(props.theme, 'text_muted')};
`

/* Stepper layout (inputs + dots) */
export const StepperContainer = styled.div`
  display: flex;
  gap: ${props => themeSpace(props.theme, 'md')};
  margin-bottom: ${props => fieldGap(props.theme)};
`

export const StepperDot = styled.div`
  /* a point of the route, the sm marker of components.steps:
     filled when done, active when set, idle still to come */
  ${({ theme, active, filled }) => stepMarkerCss(theme, { state: filled ? 'complete' : (active ? 'active' : 'idle'), size: 'sm' })}
`

export const StepperLine = styled.div`
  flex: 1;
  /* the connector of components.steps */
  ${({ theme }) => stepConnectorCss(theme, 'left')}
`

// The color and size of an icon inside a field: components.input's, as the base Input reads them
const fieldIconCss = (theme) => {
  const vars = componentVars(theme, 'input', { variant: 'default' })
  return `color: ${vars['--ui-input-icon-color']}; font-size: ${vars['--ui-input-icon-size']};`
}

// An address field (SdkField, the Google Places input) with its icon before it, level with the box
export const AddressRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${props => themeSpace(props.theme, 'md')};
`

export const AddressIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: ${({ theme }) => themeControlHeight(theme, 'input')}px;
  /* an icon beside a field (components.input icon_size, icon_color) */
  ${({ theme }) => fieldIconCss(theme)}
`

export const MapWrapper = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 40dvh;
  border-radius: ${props => themeRadius(props.theme, 'md')};
  overflow: hidden;
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};
  background: ${props => themeColor(props.theme, 'surface_alt')};
  position: relative;

  > div {
    width: 100% !important;
    height: 100% !important;
    border-radius: ${props => themeRadius(props.theme, 'md')};
  }
`

export const DistanceInfo = styled.div`
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text')};
  margin-bottom: ${props => themeSpace(props.theme, 'xs')};

  ${({ exceeded }) => exceeded && css`
    color: ${props => themeColor(props.theme, 'danger_text')};
    font-weight: 600;
  `}
`

export const StepActions = styled.div`
  margin-top: auto;
  padding-top: ${props => themeSpace(props.theme, 'lg')};
  display: flex;
  flex-direction: column;
  gap: ${props => themeSpace(props.theme, 'sm')};
`

export const MinMaxRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${props => themeSpace(props.theme, 'sm')};
  ${props => themeText(props.theme, 'caption', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};

  > span {
    cursor: pointer;
  }
  > span:last-child {
    text-align: right;
  }
`

// The min / max values are text actions (components.link muted, sm)
export const MinMaxLink = (props) => (
  <Button {...props} appearance='link' linkVariant='muted' size='sm' type='button' />
)

export const PickupNameField = styled.div`
  margin-block-end: ${props => themeSpace(props.theme, 'xs')};
`

/* ─── Step 2: Item input ──────────────────────────────────────────── */

export const ItemList = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  padding-bottom: ${props => themeSpace(props.theme, 'lg')};
`

// A line of the order: the name and its quantity in one field (components.input)
export const ItemRow = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'md')};

  .qty-value {
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
    min-width: ${props => themeIconSize(props.theme, 'md')};
    text-align: center;
  }
`

/* ─── Delivery fee display ────────────────────────────────────────── */

export const DeliveryFeeDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${props => themeSpace(props.theme, 'md')};
  background: ${props => themeColor(props.theme, 'surface_alt')};
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  ${props => themeText(props.theme, 'body', { props: ['size'] })}

  .fee-label {
    color: ${props => themeColor(props.theme, 'text_muted')};
  }

  .fee-value {
    font-weight: 600;
    color: ${props => themeColor(props.theme, 'text')};
  }
`
