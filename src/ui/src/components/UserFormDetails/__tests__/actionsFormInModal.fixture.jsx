// Fixture of actionsFormInModal.repro.mjs: the real ThemeProvider, DialogOverlay,
// ActionsForm and CardItemContent/CardBrand on a page, in one scene at a time.
// `window.mountScene(scene, themeId)`; the scenes are listed in SCENES.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '~ui/contexts/ThemeContext'
import { THEMES } from '~ui/src/design-system/preview/themes'
import { DialogOverlay } from '~ui/src/components/Overlay/overlays'
import { CardBrand } from '~ui/src/components/CardBrand'
import { CardItemContent } from '~ui/src/components/Checkout/styles'
import { bottomNavHeight } from '~ui/src/components/NavigationBar/styles'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { ActionsForm, FormInput } from '../styles'

const FIELDS = 14

const Form = ({ inFlow }) => (
  <FormInput onSubmit={(e) => e.preventDefault()}>
    {Array.from({ length: FIELDS }, (_, i) => (
      <input
        key={i}
        id={i === FIELDS - 1 ? 'last-field' : `field-${i}`}
        aria-label={`Field ${i + 1}`}
        style={{ width: '100%', boxSizing: 'border-box', height: '3.5rem', marginBottom: '1rem' }}
      />
    ))}
    <ActionsForm id='actions' $inFlow={inFlow}>
      <button type='button'>Cancel</button>
      <button type='submit' id='save'>Save</button>
    </ActionsForm>
  </FormInput>
)

export const BRANDS = ['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay']

const SCENES = {
  // Checkout and MultiCheckout: <DialogOverlay size='xl'>
  'modal-checkout': () => <DialogOverlay open size='xl' onClose={() => {}}><Form /></DialogOverlay>,
  // UserVerification: <DialogOverlay size='lg'>
  'modal-verification': () => <DialogOverlay open size='lg' onClose={() => {}}><Form /></DialogOverlay>,
  // the profile page: the bar clears the fixed NavigationBar
  page: () => <main><Form /></main>,
  // a checkout section: in flow
  inflow: () => <main><Form inFlow /></main>,
  card: () => (
    <main>
      {BRANDS.map((brand) => (
        <CardItemContent key={brand} data-brand={brand}>
          <div className='brand'><CardBrand brand={brand} /></div>
        </CardItemContent>
      ))}
    </main>
  )
}

window.mountScene = (scene, themeId) => {
  const { theme } = THEMES.find(({ id }) => id === themeId)
  window.__nav = bottomNavHeight(theme)
  window.__naturalSizes = Object.fromEntries(BRANDS.map((brand) => [brand, BUNDLED_IMAGES.general[brand]]))
  const root = document.createElement('div')
  document.body.append(root)
  const Scene = SCENES[scene]
  createRoot(root).render(<ThemeProvider theme={theme}><Scene /></ThemeProvider>)
}
