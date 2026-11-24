import React from 'react'
import { useTheme } from 'styled-components'
import { Icon } from '../../components/Icon'

export const ForwardArrow = ({ dir }) => {
  const theme = useTheme()
  const rtl = dir ? dir === 'rtl' : theme.rtl
  return <Icon name={rtl ? 'arrowLeft' : 'arrowRight'} />
}
