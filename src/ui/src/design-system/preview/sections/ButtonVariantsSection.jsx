import React, { useMemo } from 'react'
import styled, { ThemeProvider, useTheme } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { getThemeComponent } from '~/utils/themeCss'
import { themeColor } from '~/utils/themeColors'
import { themeFocusRing, themeSpace, themeText } from '~/utils/themeTokens'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { OrderIcon } from '~ui/src/components/AddressOrderType/OrderIcon'
import { authSocialCss } from '~/utils/authForm'
import { slotButtonOptions } from '~/utils/themeGroups'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { componentVars } from '../../lib/componentVars'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'
import { PortalDemo } from './portal-demo'
import { ForwardArrow } from './forward-arrow'

// implementation notes (PZ-1c): the icon slots, `socialIcon` (the social login) and `iconEnd` (the Continue
// arrow), left to right and right to left.
// implementation notes (PZ-1b): the base Button's two opt-in variants, so a browser can measure them: the
// favorite toggle and the full width button with its content at the start. The preview's own furniture
// is styled-components painted from the theme; the buttons are the design system's.

const Block = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// the card's row of text a heart bleeds into
const Line = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  ${({ theme }) => themeText(theme, 'body')}
`

// (a column, not a grid: a grid's auto track would grow to a long label's width; its items do not stretch,
// so only `fullWidth` makes one as wide as the container)
const Stack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

const Narrow = styled.div`
  width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 5);
  max-width: 100%;
`

// the base one: only the block's margin and gap (the buttons are the pieces')
const BaseSocial = styled.div`
  display: flex;
  flex-direction: column;
  ${({ theme }) => authSocialCss(theme)}
`

const LONG = 'A very long street name, a very long neighbourhood name, a very long city name, 12345'

// What the section's pieces must paint, from the theme they really read (a group's, a portal's, the
// switched one): the spec compares the browser with this, never with a literal.
const Expect = ({ id, children, ...rest }) => {
  const theme = useTheme()
  const size = getThemeComponent(theme, 'favorite').base.size
  const expectation = {
    favorite: componentVars(theme, 'favorite'),
    button: componentVars(theme, 'button', { size, shape: 'icon', color: 'neutral', appearance: 'ghost' }),
    text: componentVars(theme, 'button', { size: 'md', color: 'neutral', appearance: 'ghost' }),
    ring: themeFocusRing(theme),
    social: { ...componentVars(theme, 'button', socialOptions(theme)), ...componentVars(theme, 'auth_form') },
    end: componentVars(theme, 'button', { size: 'md', color: 'primary', appearance: 'solid' })
  }
  return <Block data-testid={id} data-expect={JSON.stringify(expectation)} {...rest}>{children}</Block>
}

// the social slot's options as the social logins take them (their shape was never read)
const socialOptions = (theme) => {
  const { shape, ...options } = slotButtonOptions(theme, 'auth_form', 'social', { size: 'lg', color: 'neutral', appearance: 'outline' })
  return options
}

const SOCIAL = [['apple', 'Apple'], ['google', 'Google'], ['facebook', 'Facebook'], ['sms', 'Login with SMS']]
const Social = ({ where }) => {
  const theme = useTheme()
  const slot = socialOptions(theme)
  return (
    <Row>
      <Narrow>
        <BaseSocial data-testid={`${where}-piece`}>
          {SOCIAL.map(([name, label], index) => (
            <Button key={name} {...slot} fullWidth socialIcon={<Icon name={name} />} busy={index === 1} disabled={index === 3} data-testid={`${where}-piece-${name}`}>{label}</Button>
          ))}
        </BaseSocial>
      </Narrow>
    </Row>
  )
}

const Continue = ({ where, dir }) => (
  <Narrow dir={dir}>
    <Stack>
      <Button fullWidth iconEnd={<ForwardArrow dir={dir} />} data-testid={`${where}-piece`}>Continue</Button>
      <Button fullWidth iconEnd={<ForwardArrow dir={dir} />} data-testid={`${where}-long`}>{LONG}</Button>
      <Button fullWidth appearance='outline' color='neutral' data-testid={`${where}-back`}>Back</Button>
    </Stack>
  </Narrow>
)

// a social icon of its own (the fixtures' is the lg icon, which a piece that ignored the key would also paint)
const bigSocial = (outer) => {
  const values = JSON.parse(JSON.stringify(outer.values))
  values.components.auth_form.base.social_icon_size = 31
  return { ...buildAppTheme(null, { version: 2, values }), platform: outer.platform }
}
const BigSocial = ({ children }) => {
  const outer = useTheme()
  const theme = useMemo(() => bigSocial(outer), [outer])
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

const Hearts = ({ where }) => (
  <>
    <Row>
      <Button favorite aria-pressed={false} aria-label='Favorite' data-testid={`${where}-piece`}><Icon name='heartOutline' /></Button>
      <Button favorite aria-pressed aria-label='Favorite' data-testid={`${where}-piece-on`}><Icon name='heartFilled' /></Button>
      <Button favorite aria-pressed={false} aria-label='Favorite' disabled data-testid={`${where}-piece-disabled`}><Icon name='heartOutline' /></Button>
    </Row>
    <Row>
      <Line>Margherita <b>$12</b><Button favorite bleed aria-pressed={false} aria-label='Favorite' data-testid={`${where}-piece-bleed`}><Icon name='heartOutline' /></Button></Line>
    </Row>
  </>
)

const Wide = ({ where, dir }) => (
  <Narrow dir={dir} data-testid={`${where}-container`}>
    <Stack>
      <Button fullWidth align='start' appearance='ghost' color='neutral' data-testid={`${where}-piece`}><OrderIcon name='mapMarker' />{LONG}</Button>
      <Button fullWidth align='start' appearance='ghost' color='neutral' data-testid={`${where}-short`}><OrderIcon name='mapMarker' />Home</Button>
      <Button fullWidth data-testid={`${where}-center`}><OrderIcon name='mapMarker' />Home</Button>
    </Stack>
  </Narrow>
)

// A favorite a store may set that the preview's themes leave at its defaults (a shadow, a background, a
// bigger heart in a bigger box); the colors are the active theme's tokens, so they follow the switch.
const loudFavorite = (outer) => {
  const values = JSON.parse(JSON.stringify(outer.values))
  Object.assign(values.components.favorite.base, {
    size: 'lg',
    icon_size: 28,
    background: values.tokens.color.surface_alt,
    shadow: { x: 0, y: 3, blur: 9, spread: 0, color: values.tokens.color.text, opacity: 0.3, elevation: 3 }
  })
  return { ...buildAppTheme(null, { version: 2, values }), platform: outer.platform }
}
const Loud = ({ children }) => {
  const outer = useTheme()
  const theme = useMemo(() => loudFavorite(outer), [outer])
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

export const ButtonVariantsSection = () => (
  <Section aria-labelledby='button-variants-title' data-testid='button-variants'>
    <SectionTitle id='button-variants-title'>Button: favorite, full width and icon slots</SectionTitle>
    <Note>
      The favorite toggle (the heart) and the full width button with its content at the start. Neither changes a
      Button that does not ask for it.
    </Note>
    <Caption>Favorite: resting, pressed, disabled, and bleeding into a row of text</Caption>
    <Expect id='bv-fav'><Hearts where='bv-fav' /></Expect>
    <Caption>Full width, content at the start: a long label, a short one, the centered default</Caption>
    <Expect id='bv-wide'><Wide where='bv-wide' /></Expect>
    <Caption>The same in a right-to-left container</Caption>
    <Expect id='bv-wide-rtl'><Wide where='bv-wide-rtl' dir='rtl' /></Expect>
    <Caption>Inside a group (header scope)</Caption>
    <ComponentScope group='header'>
      <Expect id='bv-scope'>
        <Hearts where='bv-scope' />
        <Narrow><Button fullWidth align='start' data-testid='bv-scope-wide'><Icon name='mapMarker' />{LONG}</Button></Narrow>
      </Expect>
    </ComponentScope>
    <Caption>With a favorite of its own (shadow, background, bigger heart)</Caption>
    <Loud><Expect id='bv-loud'><Hearts where='bv-loud' /></Expect></Loud>
    <Caption>Social logins: the base Button with socialIcon (Google sending, SMS disabled)</Caption>
    <Expect id='bv-social'><Social where='bv-social' /></Expect>
    <Caption>The same with a social icon size of its own (31)</Caption>
    <BigSocial><Expect id='bv-social-big'><Social where='bv-social-big' /></Expect></BigSocial>
    <Caption>Continue with the arrow at the end edge (iconEnd), a long label, and Back</Caption>
    <Expect id='bv-end'><Continue where='bv-end' /></Expect>
    <Caption>The same in a right-to-left container</Caption>
    <Expect id='bv-end-rtl'><Continue where='bv-end-rtl' dir='rtl' /></Expect>
    <Row>
      <PortalDemo id='bv-portal-layer' translateTitle={t => t('DS_PREVIEW_PORTAL_BUTTON_VARIANTS', 'Button variants')}>
        <Expect id='bv-portal'>
          <Row>
            <Button favorite aria-pressed={false} aria-label='Favorite' data-testid='bv-portal-piece'><Icon name='heartOutline' /></Button>
            <Button fullWidth align='start' data-testid='bv-portal-wide'><Icon name='mapMarker' />{LONG}</Button>
            <Button socialIcon={<Icon name='google' />} appearance='outline' color='neutral' size='lg' data-testid='bv-portal-social'>Google</Button>
            <Button iconEnd={<ForwardArrow />} data-testid='bv-portal-end'>Continue</Button>
          </Row>
        </Expect>
      </PortalDemo>
    </Row>
  </Section>
)
