import React from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { ProductShare } from '~ui/src/components/ProductShare'
import { Facebook, Whatsapp } from '~ui/src/components/Icon/brands'
import { createBrandIcon } from '~ui/src/components/Icon/brands/createBrandIcon'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Caption, Note, Section, SectionTitle } from '../ui'

// implementation notesthe product modal's share menu, two ways to build its networks,
// side by side. The same box for all six buttons (the icon Button's height and
// radius), on the axis of the share button, a space apart.
// - A: a Button per network (the theme's color) with the brand's mark in
//   one color; they would open each network's share URL, AddToAny would stay
//   for the "+". This one is a mock-up (nothing opens).
// - B: AddToAny's own buttons squared to the same box (their brand colors),
//   exactly what the product modal does: press Share to open it.

// Simple Icons' X (CC0, like the others in Icon/brands), scaled into the 20x20 area
const XMark = createBrandIcon(
  'XMark',
  <path transform='translate(2 2) scale(0.833)' d='M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z' />
)

const Pair = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 5)`}), 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
`

const Option = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  align-content: start;
`

// the product's image, with the heart and the share button over its corner as
// the modal has them (a column from 450 px, a row below)
const Frame = styled.div`
  position: relative;
  box-sizing: border-box;
  min-height: ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 10)`};
  padding: ${({ theme }) => themeSpace(theme, 'md')};
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
`

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  @media (max-width: 449px) {
    flex-direction: row;
    gap: ${({ theme }) => themeSpace(theme, 'sm')};
    > div {
      margin: 0;
    }
  }
`

const Toggle = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => themeSpace(theme, 'sm')};
`

const MockKit = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: ${({ theme }) => themeSpace(theme, 'sm')};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

const Label = styled.strong`
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'label')}
`

const OptionA = () => (
  <Controls>
    <Button favorite aria-pressed={false} aria-label='Favorite'><Icon name='heartOutline' /></Button>
    <Toggle>
      <Button shape='icon' color='neutral' appearance='solid' aria-label='Share' aria-expanded><Icon name='share' /></Button>
      <MockKit>
        <Button shape='icon' aria-label='Copy URL'><Icon name='link' /></Button>
        <Button shape='icon' color='neutral' appearance='solid' aria-label='Share on Facebook'><Facebook /></Button>
        <Button shape='icon' color='neutral' appearance='solid' aria-label='Share on WhatsApp'><Whatsapp /></Button>
        <Button shape='icon' color='neutral' appearance='solid' aria-label='Share on X'><XMark /></Button>
        <Button shape='icon' color='neutral' appearance='solid' aria-label='Share by email'><Icon name='envelope' /></Button>
        <Button shape='icon' color='neutral' appearance='solid' aria-label='More sharing options'><Icon name='plusLg' /></Button>
      </MockKit>
    </Toggle>
  </Controls>
)

const OptionB = () => (
  <Controls>
    <Button favorite aria-pressed={false} aria-label='Favorite'><Icon name='heartOutline' /></Button>
    <ProductShare defaultUrl='https://example.com/store/demo?category=1&product=1' slug='demo' categoryId={1} productId={1} product={{ id: 1, name: 'Burger' }} />
  </Controls>
)

export const ShareOptionsSection = () => (
  <Section aria-labelledby='share-options-title' data-testid='share-options'>
    <SectionTitle id='share-options-title'>Share menu: network buttons, two options</SectionTitle>
    <Note>
      The six buttons share one box (the icon Button&apos;s height and radius), the axis of the share button and a space
      apart; on a phone each has a 44 px touch area. Change the theme above to see both follow it.
    </Note>
    <Pair>
      <Option data-testid='share-option-b'>
        <Label>B. AddToAny&apos;s own buttons, squared (what the modal does)</Label>
        <Frame><OptionB /></Frame>
        <Caption>Keeps AddToAny&apos;s links, apps and its menu; their brand colors and the Twitter bird. Press Share.</Caption>
      </Option>
      <Option data-testid='share-option-a'>
        <Label>A. Our buttons with the brand mark in one color (mock-up)</Label>
        <Frame><OptionA /></Frame>
        <Caption>The theme&apos;s colors, X in place of the bird; we would build each network&apos;s share URL (AddToAny only for &quot;+&quot;).</Caption>
      </Option>
    </Pair>
  </Section>
)
