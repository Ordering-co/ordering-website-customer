import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  Container,
  AddressMenuRow,
  AddressLabel,
  FeatureItems,
  FieldButton,
  CartContextLine
} from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { useConfig } from '~components/contexts/ConfigContext'
import { useSession } from '~components/contexts/SessionContext'
import { useBusiness } from '~components/contexts/BusinessContext'
import { useUtils } from '~components/contexts/UtilsContext'
import { useSite } from '~components/contexts/SiteContext'
import { getSiteName } from '~/utils/siteBranding'
import { getCateringValues } from '~ui/utils'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { AddressForm } from '~ui/src/components/AddressForm'
import { AddressList } from '~ui/src/components/AddressList'
import { Alert } from '~ui/src/components/Confirm'
import { MomentContent } from '~ui/src/components/MomentContent'
import { AddressOrderType, OrderTypeQuickSwitch } from '~ui/src/components/AddressOrderType'
import { OrderContextCapsule, CapsuleRest, CapsuleButton } from '~ui/src/components/AddressOrderType/styles'

import { OrderIcon } from '~ui/src/components/AddressOrderType/OrderIcon'
import { Button } from '~ui/src/design-system/components/Button'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { Divider } from '~ui/src/styles/Divider'
import { HEADER_DOCKED } from '~ui/src/components/Header/styles'
import { ORDER_CONTEXT_BAR_ONE_ROW, orderContextInHeader, orderContextVisible } from '~ui/src/components/Header/orderContextPlacement'
import { headerScrollBehavior, HEADER_DOCK_ATTRIBUTE, HEADER_DOCK_EVENT, HEADER_SCROLL_FIXED } from '~ui/src/components/Header/scrollBehavior'
import { useReportDockOut } from '~ui/src/components/Header/orderContextDock'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { showsCustomerAddress } from '~/utils/singleStore'

export const OrderContextUI = (props) => {
  // isCart: the cart's line of the order: how and when, each a
  // link (components.link) that opens its modal, without the address (the
  // checkout asks it)
  const { isCheckOut, setMapErrors, isCustomerMode, isBusinessList, isDocked, isCart } = props
  // isSheet: the header's chip opens this in a Sheet, with every
  // control the theme shows (none is in the header's row there) and no bar of
  // its own; the moment and the address ask the header to open its modals
  // (onOpenMoment, onOpenAddress) instead of opening them here
  const { isSheet, onOpenMoment, onOpenAddress } = props

  const { pathname } = useLocation()
  const [, t] = useLanguage()
  const [orderState] = useOrder()
  const [configState] = useConfig()
  const [{ auth }] = useSession()
  const [{ business }] = useBusiness()
  const [{ parseDate, timeFormat, preorderDateFormat }] = useUtils()
  const [modals, setModals] = useState({ listOpen: false, formOpen: false, citiesOpen: false })
  const [alertState, setAlertState] = useState({ open: false, content: [] })
  const [modalSelected, setModalSelected] = useState(null)
  // the moment picker is saving: its dialog stays open until it ends
  const [momentBusy, setMomentBusy] = useState(false)
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const userCustomer = JSON.parse(window.localStorage.getItem('user-customer'))
  const windowSize = useWindowSize()
  const theme = useTheme()
  const [{ site }] = useSite()
  // With a fixed header the bar tells the header's row when it leaves the view
  // (under the header), and the row shows its chip
  const [dockNode, setDockNode] = useState(null)
  useReportDockOut(dockNode, !!isDocked && headerScrollBehavior(theme) === HEADER_SCROLL_FIXED)
  // docked, the header (revealing) counts the bar in what it covers: it tells
  // when the bar comes, goes or changes size
  useEffect(() => {
    if (!dockNode || !isDocked) return undefined
    const notify = () => window.dispatchEvent(new Event(HEADER_DOCK_EVENT))
    // the slide with the header ends: measure again with the bar where it stays
    const onSlideEnd = (event) => { if (event.target === dockNode && event.propertyName === 'transform') notify() }
    notify()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(notify) : null
    observer?.observe(dockNode)
    dockNode.addEventListener('transitionend', onSlideEnd)
    return () => {
      observer?.disconnect()
      dockNode.removeEventListener('transitionend', onSlideEnd)
      notify()
    }
  }, [dockNode, isDocked])
  // docked, the bar has only the controls the header's row does not
  const inHeader = isDocked && !isSheet ? orderContextInHeader(windowSize.width) : {}
  // the controls the theme shows (visibility.order_context.*); the address
  // also needs the order type (implementation notes, showsCustomerAddress)
  const visible = orderContextVisible(theme, orderState?.options?.type)

  const isPreOrderSetting = configState?.configs?.preorder_status_enabled?.value === '1'
  const cateringTypeString = orderState?.options?.type === 7
    ? 'catering_delivery'
    : orderState?.options?.type === 8
      ? 'catering_pickup'
      : null

  const cateringValues = getCateringValues(cateringTypeString, pathname.includes('store') && Object?.keys(business || {})?.length > 0 ? business?.configs : configState?.configs)
  const handleFindBusinesses = () => {
    if (showsCustomerAddress(orderState?.options?.type) && !orderState?.options?.address?.location) {
      setAlertState({ open: true, content: [t('SELECT_AN_ADDRESS_TO_SEARCH', 'Select or add an address to search')] })
      return
    }
    setModals({ listOpen: false, formOpen: false })
  }

  const handleCloseAlerts = () => {
    setAlertState({ open: false, content: [] })
    setMapErrors && setMapErrors('')
  }

  const handleClickAddress = (e) => {
    if (auth) {
      setModals({ ...modals, listOpen: true })
    } else {
      setModals({ ...modals, formOpen: true })
    }
  }

  const openModal = (opt) => {
    setModalSelected(opt)
    setModalIsOpen(true)
  }
  const openMoment = () => (onOpenMoment ? onOpenMoment() : openModal('moment'))
  const openAddress = () => (onOpenAddress ? onOpenAddress() : handleClickAddress())

  // What the moment field shows (the moment or ASAP); the order type's
  // label comes from AddressOrderType / OrderTypeQuickSwitch now (same
  // icons and descriptions everywhere, no local copy here)
  const momentLabel = orderState?.options?.moment
    ? parseDate(orderState.options.moment, { outputFormat: `${preorderDateFormat} ${timeFormat}` })
    : t('ASAP_ABBREVIATION', 'ASAP')

  // the controls this bar has: the theme shows them, and the header's row
  // does not have them (docked)
  const showAddress = visible.address && !inHeader.address && !isCart
  const showType = visible.type && !inHeader.type
  const showMoment = visible.moment && isPreOrderSetting && !inHeader.moment
  const hasControls = showAddress || showType || showMoment
  const anyOpen = modalIsOpen || modals.formOpen || modals.listOpen || alertState.open
  // no control left: nothing at all (no empty bar)
  if (!hasControls && !anyOpen) return null

  // mobile capsule: the switcher on its own line, "moment · address" on a
  // second one, when the address shares the capsule or there is no room for
  // one line (<420px, verified against "ASAP" clipping to "AS…" at 375px; a
  // scheduled moment, "24/11 12:30AM", is longer: <460px, else at 420px the
  // capsule ran past the screen and the whole page scrolled sideways, implementation notes);
  // otherwise one line
  // (the docked bar is one row from ORDER_CONTEXT_BAR_ONE_ROW, the address the rest of it)
  const oneLineMin = orderState?.options?.moment ? 460 : 420
  const stacked = (isSheet || (isDocked && windowSize.width < ORDER_CONTEXT_BAR_ONE_ROW)) && showType && (showAddress || windowSize.width < oneLineMin)

  const addressLabel = orderState.options?.address?.address || t('WHERE_DO_WE_DELIVERY', 'Where do we delivery?')

  // the order type, the moment and the address as one capsule: the bar docked
  // under the header, and the header chip's sheet
  const capsule = (
    <OrderContextCapsule aria-label={t('YOUR_ORDER', 'Your order')} $stacked={stacked}>
      {showType && <AddressOrderType />}
      {(showMoment || showAddress) && (
        <CapsuleRest $stacked={stacked}>
          {showMoment && (
            <>
              {/* a divider only between items on the SAME row: not
                  stacked, the switcher is right before this one;
                  stacked, this is the row's first item (the
                  switcher is on the row above) */}
              {!stacked && showType && <Divider $variant='vertical' $decorative />}
              <CapsuleButton $moment data-doc-control='order-moment-open' onClick={openMoment} aria-haspopup='dialog'>
                <OrderIcon name='clockOutline' aria-hidden='true' />
                <span title={momentLabel}>{momentLabel}</span>
                <ChevronIcon kind='list' gap={false} />
              </CapsuleButton>
            </>
          )}
          {showAddress && (
            <>
              {(showMoment || (!stacked && showType)) && <Divider $variant='vertical' $decorative />}
              <CapsuleButton data-doc-control='order-address-open' onClick={openAddress} aria-haspopup='dialog'>
                <OrderIcon name='mapMarker' aria-hidden='true' />
                <span title={addressLabel}>{addressLabel}</span>
                <ChevronIcon kind='list' gap={false} />
              </CapsuleButton>
            </>
          )}
        </CapsuleRest>
      )}
    </OrderContextCapsule>
  )

  return (
    <>
      {isCart && hasControls && (
        <CartContextLine data-doc-section='cart-order-context'>
          {showType && (
            <OrderTypeQuickSwitch
              ariaLabel={t('ORDER_TYPE', 'Order type')}
              renderTrigger={(triggerProps, selected) => (
                <Button appearance='link' data-doc-control='order-type-open' {...triggerProps}>
                  {selected.text}
                  <ChevronIcon kind='list' gap={false} open={triggerProps['aria-expanded']} />
                </Button>
              )}
            />
          )}
          {showType && showMoment && <span aria-hidden='true'>·</span>}
          {showMoment && (
            <Button appearance='link' type='button' data-doc-control='order-moment-open' onClick={() => openModal('moment')}>
              {momentLabel}
            </Button>
          )}
        </CartContextLine>
      )}
      {!isCart && hasControls && isSheet && capsule}
      {!isCart && hasControls && !isSheet && (
        <Container
          ref={setDockNode}
          isBusinessList={isBusinessList}
          hero={props.hideHero}
          isCheckOut={isCheckOut}
          $docked={isDocked}
          className={isDocked ? HEADER_DOCKED : undefined}
          {...(isDocked && { [HEADER_DOCK_ATTRIBUTE]: '' })}
        >
          {isDocked
            ? capsule
            : (
              <>
                {showAddress && (
                  <AddressMenuRow>
                    <Button color='neutral' appearance='ghost' layout='row' borderInset onClick={() => handleClickAddress()}>
                      <OrderIcon name='mapMarker' />
                      <AddressLabel title={addressLabel}>{addressLabel}</AddressLabel>
                    </Button>
                  </AddressMenuRow>
                )}
                {/* each one is a button with the look of a field of the theme
                    that opens its modal (the moment) or the rich listbox
                    (the order type) */}
                {(showType || showMoment) && (
                  <FeatureItems>
                    {showType && (
                      <OrderTypeQuickSwitch
                        ariaLabel={t('ORDER_TYPE', 'Order type')}
                        renderTrigger={(triggerProps, selected) => (
                          <FieldButton data-doc-control='order-type-open' {...triggerProps}>
                            <OrderIcon name={selected.icon} aria-hidden='true' />
                            <span title={selected.text}>{selected.text}</span>
                            <ChevronIcon kind='list' gap={false} open={triggerProps['aria-expanded']} />
                          </FieldButton>
                        )}
                      />
                    )}
                    {showMoment && (
                      <FieldButton onClick={() => openModal('moment')}>
                        <OrderIcon name='clockOutline' aria-hidden='true' />
                        <span title={momentLabel}>{momentLabel}</span>
                        <ChevronIcon kind='list' gap={false} />
                      </FieldButton>
                    )}
                  </FeatureItems>
                )}
              </>
              )}
        </Container>
      )}
      {modalIsOpen && (
        <DialogOverlay
          legacyMaxWidth
          open={modalIsOpen}
          onClose={momentBusy ? undefined : () => setModalIsOpen(false)}
          showCloseButton={!momentBusy}
          width={orderState?.options?.user_id ? '70%' : '50%'}
        >
          {modalSelected === 'moment' && (
            <MomentContent
              onClose={() => setModalIsOpen(false)}
              onBusyChange={setMomentBusy}
              cateringPreorder={!!cateringTypeString}
              isHeader
              business={pathname.includes('store') && business}
              {...cateringValues}
            />
          )}
        </DialogOverlay>
      )}
      {modals.formOpen && (
        <DialogOverlay
          title={t('ADDRESS_FORM', 'Address Form')}
          open={modals.formOpen}
          onClose={() => setModals({ ...modals, formOpen: false })}
        >
          <AddressForm
            useValidationFileds
            address={orderState?.options?.address || {}}
            onClose={() => setModals({ ...modals, formOpen: false })}
            onCancel={() => setModals({ ...modals, formOpen: false })}
            onSaveAddress={() => setModals({ ...modals, formOpen: false })}
          />
        </DialogOverlay>
      )}
      {modals.listOpen && (
        <DialogOverlay
          legacyMaxWidth
          open={modals.listOpen}
          width='70%'
          onClose={() => setModals({ ...modals, listOpen: false })}
        >
          <AddressList
            isModal
            changeOrderAddressWithDefault
            userId={isNaN(userCustomer?.id) ? null : userCustomer?.id}
            onCancel={() => setModals({ ...modals, listOpen: false })}
            onAccept={() => handleFindBusinesses()}
            isCustomerMode={isCustomerMode}
            isMobile
          />
        </DialogOverlay>
      )}
      <Alert
        // the site's name, else "My Site"
        title={getSiteName({ theme, site })}
        content={alertState.content}
        acceptText={t('ACCEPT', 'Accept')}
        open={alertState.open}
        onClose={() => handleCloseAlerts()}
        onAccept={() => handleCloseAlerts()}
        closeOnBackdrop={false}
      />
    </>
  )
}
