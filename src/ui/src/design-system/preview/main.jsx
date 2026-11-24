import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import styled, { useTheme } from 'styled-components'
import { ThemeProvider } from '~ui/contexts/ThemeContext'
import { LanguageContext, useLanguage } from '~components/contexts/LanguageContext'
import translations from '../../../../../i18n/translations.json'
import { sourceLanguage, supportedLocales } from '../../../../../i18n/config.json'
import { Button } from '../components/Button'
import { themeFonts } from '~/utils/appTheme'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
// The one Tailwind sheet: the pieces import it themselves, the preview does too
// so it is compiled and loaded even before the first piece exists.
import '../styles.css'
import { THEMES } from './themes'
import { ActionsSection, AvatarSection, ButtonSection, ButtonVariantsSection, CheckboxSection, ChipSection, ChoiceSection, ComponentVarsSection, DialogSection, IconMapSection, IconOptionsSection, IconSection, InputCodeSection, InputPhoneSection, InputSection, Listing1335BSection, OverlaySection, PopoverSection, ProductModalSection, RatingSection, SdkFieldSection, SelectSection, ShareOptionsSection, SheetDragSection, SubmitStateSection, TabsSection, TextareaSection, TokensSection } from './sections'
import { Caption, Page, Row, Title } from './ui'
import { CartLoadingSection } from './sections/1639-cart-loading'

// Not the app, and not in the production build (nothing imports it; the HTML
// is not a Vite input): the real theme (buildAppTheme + the app's
// ThemeProvider, which writes the `--ot-*` variables), three themes unlike each
// other, a selector that swaps them without a reload. `?theme=grill`.

const firstTheme = () => THEMES.find(({ id }) => id === new URLSearchParams(window.location.search).get('theme')) || THEMES[0]

const Bar = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

const Switcher = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
`

// (the pieces under test do not exist yet: the selector is plain furniture)
const Choice = styled.button`
  cursor: pointer;
  padding: ${({ theme }) => `${themeSpace(theme, 'xs')} ${themeSpace(theme, 'md')}`};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)}`} ${({ theme, $on }) => themeColor(theme, $on ? 'primary' : 'border_strong')};
  background: ${({ theme, $on }) => ($on ? themeColor(theme, 'primary') : themeColor(theme, 'surface'))};
  color: ${({ theme, $on }) => themeColor(theme, $on ? 'on_primary' : 'text')};
  ${({ theme }) => themeText(theme, 'label')}
`

// The Google Fonts of the theme's two roles, as App.js does: they follow the theme.
const Fonts = () => {
  const theme = useTheme()
  const { body, heading } = themeFonts(theme)
  useEffect(() => {
    const links = [body, heading].map((font) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = font.href
      document.head.appendChild(link)
      return link
    })
    return () => links.forEach((link) => link.remove())
  }, [body.href, heading.href])
  return null
}

const Preview = () => {
  const [, t] = useLanguage()
  const [active, setActive] = useState(firstTheme)
  const [rtl, setRtl] = useState(false)
  const select = ({ id }) => {
    setActive(THEMES.find((entry) => entry.id === id))
    const next = new URLSearchParams(window.location.search)
    next.set('theme', id)
    window.history.replaceState(null, '', `?${next}`)
  }
  return (
    <ThemeProvider theme={active.theme} direction={rtl ? 'rtl' : 'ltr'}>
      <Fonts />
      <Page data-theme-id={active.id}>
        <Bar>
          <Title>Design system preview</Title>
          <Row>
            <Caption>Theme</Caption>
            <Switcher role='group' aria-label='Theme'>
              {THEMES.map((entry) => (
                <Choice key={entry.id} type='button' $on={entry.id === active.id} aria-pressed={entry.id === active.id} data-testid={`theme-${entry.id}`} onClick={() => select(entry)}>
                  {entry.name}
                </Choice>
              ))}
            </Switcher>
            <Button
              appearance={rtl ? 'solid' : 'outline'}
              aria-pressed={rtl}
              onClick={() => setRtl(value => !value)}
            >
              {t('DS_PREVIEW_RTL', 'Right-to-left')}
            </Button>
          </Row>
        </Bar>
        <TokensSection theme={active.theme} />
        <IconSection />
        <IconMapSection />
        <IconOptionsSection />
        <ComponentVarsSection />
        <ButtonSection />
        <ButtonVariantsSection />
        <InputSection />
        <DialogSection />
        <ShareOptionsSection />
        <Listing1335BSection />
        <ProductModalSection />
        <SubmitStateSection />
        <CartLoadingSection />
        <SheetDragSection />
        <ChipSection />
        <AvatarSection />
        <RatingSection />
        <TabsSection />
        <PopoverSection />
        <SelectSection />
        <OverlaySection />
        <TextareaSection />
        <ChoiceSection />
        <CheckboxSection />
        <ActionsSection />
        <InputCodeSection />
        <InputPhoneSection />
        <SdkFieldSection />
      </Page>
    </ThemeProvider>
  )
}

// The standalone catalog has no API session. Use the bundled website
// dictionary for its controls and keep the examples in their original language.
const languageCode = navigator.languages
  .map(locale => locale.toLowerCase().split('-')[0])
  .find(code => code === sourceLanguage || supportedLocales.includes(code)) ?? sourceLanguage
const previewLanguage = [
  { language: { code: languageCode } },
  (key, fallback) => translations[key]?.[languageCode] || fallback || key
]

createRoot(document.getElementById('root')).render(
  <LanguageContext.Provider value={previewLanguage}>
    <Preview />
  </LanguageContext.Provider>
)
