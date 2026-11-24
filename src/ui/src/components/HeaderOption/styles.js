import React from 'react'
import styled, { useTheme } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { slotButtonOptions, slotSize } from '~/utils/themeGroups'
import { Button } from '~ui/src/design-system/components/Button'
import { ComponentScope } from '~ui/src/styles/ComponentScope'

const AddressLabel = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`

export const Container = ({ variant, $isHome, children, style, ...props }) => {
  const theme = useTheme()
  const controlStyle = { ...($isHome && { color: themeColor(theme, 'on_overlay') }), ...style }
  if (variant === 'moment') {
    return <Button {...props} style={controlStyle} appearance='input-trigger' inputTrigger='header' size={slotSize(theme, 'header', 'moment', 'md')}>{children}</Button>
  }
  if (variant === 'address') {
    const options = slotButtonOptions(theme, 'header', 'address', { color: 'neutral', appearance: 'ghost' })
    return (
      <ComponentScope group='header'>
        <Button {...props} {...options} style={controlStyle} layout='row' align='start' borderInset>
          <AddressLabel>{React.isValidElement(children) ? children.props.children : children}</AddressLabel>
        </Button>
      </ComponentScope>
    )
  }
  return <Button {...props} style={controlStyle} appearance='plain'>{children}</Button>
}

export const DeliveryType = styled.p`
  user-select: none;
  cursor: pointer;
  margin: 0;
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
`
