import React, { useEffect, useState } from 'react'
import { useTheme } from 'styled-components'
import {
  Container,
  BackDropContainer,
  TopContainer,
  IconContent,
  SidebarContent,
  MenuClose,
  CartContentWrapper
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { CartContent } from '~ui/src/components/CartContent'

import { Icon } from '~ui/src/design-system/components/Icon'

export const CartSidebar = (props) => {
  const {
    open,
    carts
  } = props

  const [, t] = useLanguage()
  const theme = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [orderState] = useOrder()

  // the drawer opens as wide as the theme's md dialog (it was 560px) so the driver-tip
  // row and the Total + Checkout + Add more controls have room to breathe; where that does not
  // fit, it goes full-bleed (100%).
  const openWidth = `min(100%, ${componentVars(theme, 'modal', { size: 'md' })['--ui-modal-width']})`

  const actionSidebar = (value) => {
    if (!value) {
      props.onClose()
    }
    setIsMenuOpen(value)
    document.getElementById('cartSidebar').style.width = value ? openWidth : '0'
  }

  useEffect(() => {
    if (!open) return
    actionSidebar(true)
  }, [open])

  return (
    <>
      <Container>
        <IconContent
          onClick={() => actionSidebar(true)}
        >
          <Icon name="cart" />
          {carts?.length > 0 && <span>{props.carts?.length}</span>}
        </IconContent>
        {isMenuOpen && (
          <BackDropContainer onClick={() => actionSidebar(false)} />
        )}
        <SidebarContent
          id='cartSidebar'
        >
          <TopContainer>
            <h4>{t('YOUR_CART', 'Your cart')}</h4>
            <MenuClose
              aria-label={t('CLOSE', 'Close')}
              onClick={() => actionSidebar(false)}
            >
              <Icon name="closeMd" />
              {t('CLOSE', 'close')}
            </MenuClose>
          </TopContainer>
          <CartContentWrapper>
            <CartContent
              isOpenCart={isMenuOpen}
              isCartPopover
              isSidebar
              carts={props.carts}
              isOrderStateCarts={!!orderState.carts}
              onClose={() => actionSidebar(false)}
            />
          </CartContentWrapper>
        </SidebarContent>
      </Container>
    </>
  )
}
