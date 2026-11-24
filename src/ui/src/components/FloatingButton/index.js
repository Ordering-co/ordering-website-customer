import React from 'react'

import {
  Container,
  FloatingButtonLane,
  BtnValue
} from './styles'

import { FloatingButton as FloatingButtonController } from '~components/components/FloatingButton'
import { Button } from '~ui/src/design-system/components/Button'
import { BOTTOM_NAV_DOCKED } from '~ui/src/components/NavigationBar/styles'

const FloatingButtonUI = (props) => {
  const {
    btnText,
    btnValue,
    handleButtonClick,
    disabled,
    isSecondaryBtn
  } = props

  return (
    <Container className={BOTTOM_NAV_DOCKED}>
      <FloatingButtonLane>
        <Button
          cartFab
          fullWidth
          color={isSecondaryBtn ? 'secondary' : 'primary'}
          onClick={handleButtonClick}
          disabled={disabled}
        >
          {btnText}
          <BtnValue>{btnValue}</BtnValue>
        </Button>
      </FloatingButtonLane>
    </Container>
  )
}

export const FloatingButton = (props) => {
  const floatingButtonProps = {
    ...props,
    UIComponent: FloatingButtonUI
  }

  return (
    <FloatingButtonController {...floatingButtonProps} />
  )
}
