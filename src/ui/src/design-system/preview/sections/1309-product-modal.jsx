import React, { useCallback, useMemo, useState } from 'react'
import { ThemeProvider as StyledThemeProvider, useTheme } from 'styled-components'
import { ConfigContext } from '~components/contexts/ConfigContext'
import { EventContext } from '~components/contexts/EventContext'
import { OrderContext } from '~components/contexts/OrderContext'
import { SessionContext } from '~components/contexts/SessionContext'
import { ToastContext } from '~components/contexts/ToastContext'
import { UtilsContext } from '~components/contexts/UtilsContext'
import { WebsocketContext } from '~components/contexts/WebsocketContext'
import { ProductForm } from '~ui/src/components/ProductForm'
import { ProductModal } from '~ui/src/components/ProductForm/ProductModal'
import { missingChoicesMode, productModalLayout } from '~ui/src/components/ProductForm/productModalSettings'
import { buildAppTheme } from '~/utils/appTheme'
import compiledTheme from '~/theme.compiled.json'
import tallPhoto from '~/assets/images/home-hero-mobile.jpg'
import widePhoto from '~/assets/images/business-hero.jpg'
import { Chip } from '../../components/Chip'
import { Button } from '../../components/Button'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// implementation notesthe product window as the app mounts it (ProductModal around the
// real ProductForm and its controller), with a store's product and no network.
// Only what is outside the form is stood in for: the contexts the form reads
// (session, order, config, utils, toast, websocket, event) are given fixed
// values, and `addProduct` records the call instead of sending it.
const modalSchema = compiledTheme.values.components.product_modal.base
const LAYOUTS = modalSchema.layout.$rule.slice(1)
const MISSING = modalSchema.missing_choices.$rule.slice(1)
export const STATES = [
  { id: 'choosing', label: 'Choosing' },
  { id: 'pending', label: 'Required pending' },
  { id: 'required', label: 'One required group' },
  { id: 'plain', label: 'No options' },
  { id: 'many', label: 'Many groups' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'tall', label: 'Tall image' },
  { id: 'wide', label: 'Wide image' },
  { id: 'guest', label: 'Guest' },
  { id: 'no-image', label: 'No image' },
  { id: 'sold-out', label: 'Sold out' },
  { id: 'closed', label: 'Store closed' }
]

// Not the store's photo: a fixed picture, so the preview and the browser spec need no network.
export const PHOTO = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480'><rect width='640' height='480' fill='#c9904a'/><circle cx='320' cy='240' r='140' fill='#e8c27a'/></svg>")}`

const sub = (id, name, price = 0, more = {}) => ({ id, name, price, rank: id % 10, enabled: true, ...more })

// A product as the API serves it. `choosing` has its required groups chosen
// (preselected); `pending` has them empty.
const productOf = (state) => {
  const preselect = !['pending', 'required', 'many'].includes(state)
  const options = [
    { id: 11, rank: 1, name: 'Filling', min: 1, max: 1, suboptions: [sub(111, 'Paneer', 0, { preselected: preselect }), sub(112, 'Spiced potato'), sub(113, 'Cheese and garlic', 0.5)] },
    { id: 12, rank: 2, name: 'Dips', min: 1, max: 2, suboptions: [sub(121, 'Mint chutney', 0, { preselected: preselect }), sub(122, 'Tamarind chutney', 0.5), sub(123, 'Cucumber raita', 0.5), sub(124, 'Mango pickle', 0.5)] },
    { id: 13, rank: 3, name: 'Extras', min: 0, max: 5, allow_suboption_quantity: true, suboptions: [sub(131, 'Side of dal', 3), sub(132, 'Extra butter', 0.75), sub(133, 'Fried egg', 1)] }
  ]
  if (state === 'many') {
    options.push(
      { id: 14, rank: 4, name: 'Bread', min: 0, max: 1, suboptions: [sub(141, 'Garlic naan', 2.5), sub(142, 'Roti', 1.5)] },
      { id: 15, rank: 5, name: 'Drinks', min: 0, max: 1, suboptions: [sub(151, 'Mango lassi', 3.5), sub(152, 'Masala chai', 2.5)] },
      { id: 16, rank: 6, name: 'Dessert', min: 0, max: 1, suboptions: [sub(161, 'Rice pudding', 3), sub(162, 'Gulab jamun', 2)] }
    )
  }
  const photos = { 'no-image': null, 'short-options': null, placeholder: null, tall: tallPhoto, wide: widePhoto }
  return {
    id: 7,
    name: 'Stuffed naan',
    price: 6.5,
    ...(state === 'weight' && { weight: 0.5, weight_unit: 'kg' }),
    description: 'Tandoor-baked naan filled to order, brushed with butter and finished with coriander.',
    images: state in photos ? photos[state] : PHOTO,
    // The browser spec intercepts the video and thumbnail requests.
    gallery: state === 'two-photos' ? [{ file: widePhoto }] : state === 'gallery' ? [{ file: widePhoto }, { file: tallPhoto }, { video: 'https://www.youtube.com/watch?v=preview' }] : [],
    category_id: 1,
    inventoried: state === 'sold-out',
    quantity: state === 'sold-out' ? 0 : undefined,
    ingredients: ['plain', 'required', 'short-options'].includes(state) ? [] : [{ id: 1, name: 'Coriander' }, { id: 2, name: 'Red onion' }, { id: 3, name: 'Butter' }],
    extras: [{ id: 1, rank: 1, options: state === 'plain' ? [] : state === 'required' ? options.slice(0, 1) : state === 'two-groups' ? options.slice(0, 2) : state === 'short-options' ? [{ ...options[0], suboptions: options[0].suboptions.slice(0, 1) }] : options }]
  }
}

const businessOf = (state) => ({
  id: 1,
  name: 'Cha Sha',
  slug: 'cha-sha',
  // `schedule`: closed, but the order can be scheduled (the form is given the action)
  open: !['closed', 'schedule'].includes(state),
  timezone: 'UTC',
  schedule: []
})

// Treat picker choices as theme input. The same engine used by the app
// rejects unknown values and builds the matching CSS view.
export const previewProductTheme = (theme, { layout, missing, state }) => {
  if (layout == null && missing == null && !['no-image', 'short-options'].includes(state)) return theme
  const values = JSON.parse(JSON.stringify(theme.values))
  const modal = values.components.product_modal.base
  if (layout != null) modal.layout = layout
  if (missing != null) modal.missing_choices = missing
  if (['no-image', 'short-options'].includes(state)) {
    values.visibility['product.dummy_image'] = false
    Object.values(values.platforms || {}).forEach((platform) => platform?.visibility && (platform.visibility['product.dummy_image'] = false))
  }
  const rebuilt = buildAppTheme({ images: theme.values.images }, { version: 2, values })
  return { ...theme, values: rebuilt.values, css: rebuilt.css }
}

const toast = [{}, { showToast: () => {}, hideToast: () => {} }]
const socket = { getId: () => null }
const utils = [{ optimizeImage: (url) => url, parsePrice: (value) => `$${Number(value).toFixed(2)}`, is12Hours: true }]
const config = [{ configs: {} }]
const session = [{ auth: true, loading: false, user: { id: 1 }, token: 't' }, { login: () => {} }]
const guestSession = [{ auth: false, loading: false, user: null }, { login: () => {} }]
const noEvents = [{ emit: () => {}, on: () => {}, off: () => {} }]

/**
 * The product window, open or not, for a layout, a `missing_choices` mode and a
 * state. `onAdd` hears each product the form hands to the order. The window
 * remounts when any of the three changes (the form keeps what was chosen).
 */
export const ProductModalScene = ({ layout, missing, state, open, onClose, onAdd }) => {
  const selectedTheme = useCallback((outer) => previewProductTheme(outer, { layout, missing, state }), [layout, missing, state])
  const orderType = state === 'no-address' ? 1 : 2
  // no address is `null`, as the order has it: a missing one is the list's "network error"
  const noAddress = state === 'no-address'
  const order = useMemo(() => [
    { loading: false, options: { type: orderType, moment: null, ...(noAddress && { address: null }) }, carts: {} },
    { addProduct: async (product) => { onAdd?.(product); return true }, updateProduct: async () => true, addMultiProduct: async () => true }
  ], [onAdd, orderType, noAddress])
  const product = useMemo(() => productOf(state), [state])
  const business = useMemo(() => businessOf(state), [state])
  return (
    <StyledThemeProvider theme={selectedTheme}>
      <SessionContext.Provider value={state === 'guest' ? guestSession : session}>
        <ConfigContext.Provider value={config}>
          <UtilsContext.Provider value={utils}>
            <ToastContext.Provider value={toast}>
              <WebsocketContext.Provider value={socket}>
                <EventContext.Provider value={noEvents}>
                  <OrderContext.Provider value={order}>
                    <ProductModal open={open} onClose={onClose} dataDocSection='product-customization-dialog'>
                      <ProductForm key={`${layout}-${missing}-${state}`} useOrderContext business={business} businessSlug={business.slug} businessId={business.id} product={product} onSave={() => {}} onRequestSchedule={state === 'schedule' ? () => {} : undefined} />
                    </ProductModal>
                  </OrderContext.Provider>
                </EventContext.Provider>
              </WebsocketContext.Provider>
            </ToastContext.Provider>
          </UtilsContext.Provider>
        </ConfigContext.Provider>
      </SessionContext.Provider>
    </StyledThemeProvider>
  )
}

const Picker = ({ name, options, value, onChange }) => (
  <Row role='group' aria-label={name}>
    <Caption>{name}</Caption>
    {options.map(({ id, label }) => (
      <Chip key={id} selected={value === id} onClick={() => onChange(id)} data-testid={`${name.toLowerCase().replace(/\W+/g, '-')}-${id}`}>{label}</Chip>
    ))}
  </Row>
)

export const ProductModalSection = () => {
  const theme = useTheme()
  const [layout, setLayout] = useState(null)
  const [missing, setMissing] = useState(null)
  const [state, setState] = useState('choosing')
  const [open, setOpen] = useState(false)
  const [added, setAdded] = useState(0)
  const onAdd = useCallback(() => setAdded((count) => count + 1), [])
  return (
    <Section aria-labelledby='product-modal-title' data-testid='product-modal'>
      <SectionTitle id='product-modal-title'>Product window</SectionTitle>
      <Note>
        The window of a product as the app opens it: its real form, with a store&apos;s product and nothing sent
        anywhere. The preview starts with the theme’s layout and missing-choice behavior. Choose a different setting to try it.
      </Note>
      <Picker name='Layout' options={LAYOUTS.map((id) => ({ id, label: id }))} value={layout ?? productModalLayout(theme)} onChange={setLayout} />
      <Picker name='Missing choices' options={MISSING.map((id) => ({ id, label: id }))} value={missing ?? missingChoicesMode(theme)} onChange={setMissing} />
      <Picker name='State' options={STATES} value={state} onChange={setState} />
      <Row>
        <Button onClick={() => setOpen(true)} data-testid='product-modal-open'>Open the product</Button>
        <Caption data-testid='product-modal-added' data-added={added}>Added to the order: {added}</Caption>
      </Row>
      <ProductModalScene layout={layout} missing={missing} state={state} open={open} onClose={() => setOpen(false)} onAdd={onAdd} />
    </Section>
  )
}
