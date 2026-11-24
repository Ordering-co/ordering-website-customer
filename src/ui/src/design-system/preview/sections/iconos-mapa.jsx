import React, { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeIconSize, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { Icon as LegacyIcon } from '../../../components/Icon'
import { FILLED_ICONS, LUCIDE_ICON_REGISTRY } from '../../../components/Icon/lucideRegistry'
import { Icon } from '../../components/Icon'
import { Caption, Note, Section, SectionTitle } from '../ui'

// Copy of docs/design-system/iconos-mapa.md (section 2, column «equivalencia»,
// and section 6 for `unused`). A name in none of the sets is `exact`.
const APPROXIMATE = new Set(['cardChecklist', 'caretLeftFill', 'caretUpFill', 'carSide', 'closeOctagon', 'dot', 'fullscreen', 'menuAltRight', 'pinMapFill', 'searchLoading'])
const BRAND = new Set(['apple', 'facebook', 'google', 'instagram', 'paypal', 'pinterest', 'snapchat', 'stripe', 'stripeCard', 'stripeS', 'tiktok', 'whatsapp'])
const CUSTOM = new Set(['circleHalf'])
const FILLED_TO_STROKE = new Set([
  'addressBook', 'basketFilled', 'briefcase', 'cart', 'cellphone', 'checkCircleFill', 'closeCircle', 'crown', 'dashSquareFill', 'exclamationFilled',
  'eyeFilled', 'eyeSlashFilled', 'geoAltFill', 'home', 'link', 'locationFood', 'mapMarker', 'plusSquareFill', 'radioChecked', 'radioChoiceOn',
  'radioOn', 'sendFilled', 'shopFilled', 'signOut', 'sms', 'tag', 'trashFilled', 'truckDelivery', 'user', 'userFilled', 'walletCash'
])
const UNUSED = new Set([
  'building', 'calendar', 'carFront', 'carSide', 'cart3', 'cellphone', 'chat', 'check2', 'checkboxBlank', 'checkOutline', 'checkSquare', 'chevronDown',
  'chevronLeft', 'chevronRight', 'clockOutline', 'dashSquare', 'dashSquareFill', 'exclamationFilled', 'eyeBs', 'eyeSlashBs', 'heartFilled', 'link', 'lock',
  'menu', 'radioCheck', 'radioChecked', 'radioCheckedAlt', 'radioOff', 'radioOn', 'radioUnchecked', 'share', 'shopFilled', 'signOut', 'truckOutline', 'userFilled'
])

const kindOf = (name) => {
  if (APPROXIMATE.has(name)) return 'approximate'
  if (BRAND.has(name)) return 'brand'
  if (CUSTOM.has(name)) return 'custom'
  if (FILLED_ICONS.has(name)) return 'still filled'
  if (FILLED_TO_STROKE.has(name)) return 'filled → stroke'
  return 'exact'
}

const NAMES = Object.keys(LUCIDE_ICON_REGISTRY).sort((a, b) => a.localeCompare(b))
const ROWS = NAMES.map((name) => ({ name, kind: kindOf(name), unused: UNUSED.has(name) }))
const FILTERS = ['All', 'approximate', 'filled → stroke', 'still filled', 'brand', 'custom', 'exact']
const LEVELS = ['sm', 'md', 'lg']

const Switcher = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
`

// Same furniture as the theme switcher of the preview: a toggle with aria-pressed.
const Choice = styled.button`
  cursor: pointer;
  padding: ${({ theme }) => `${themeSpace(theme, 'xs')} ${themeSpace(theme, 'md')}`};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)}`} ${({ theme, $on }) => themeColor(theme, $on ? 'primary' : 'border_strong')};
  background: ${({ theme, $on }) => ($on ? themeColor(theme, 'primary') : themeColor(theme, 'surface'))};
  color: ${({ theme, $on }) => themeColor(theme, $on ? 'on_primary' : 'text')};
  ${({ theme }) => themeText(theme, 'label')}
`

// Scrolls on its own, so the page never overflows on a phone; focusable so the keyboard can scroll it.
const Scroller = styled.div`
  overflow-x: auto;
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border')}`};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'caption')}
  th, td {
    padding: ${({ theme }) => `${themeSpace(theme, 'xs')} ${themeSpace(theme, 'md')}`};
    text-align: start;
    white-space: nowrap;
    border-bottom: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border')}`};
  }
  thead th {
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
    background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  }
`

// The approximate rows stand out by a fill and by their text label (never by color alone).
const Tr = styled.tr`
  ${({ theme, $approximate }) => $approximate && `background: ${themeColor(theme, 'primary_subtle')};`}
`

const Glyphs = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

const Kind = styled.span`
  ${({ theme, $approximate }) => $approximate && `${themeText(theme, 'label')} color: ${themeColor(theme, 'primary_text')};`}
`

export const IconMapSection = () => {
  const theme = useTheme()
  const [filter, setFilter] = useState('All')
  const shown = ROWS.filter(({ kind }) => filter === 'All' || kind === filter)
  const count = (name) => (name === 'All' ? ROWS.length : ROWS.filter(({ kind }) => kind === name).length)
  return (
    <Section aria-labelledby='icon-map-title'>
      <SectionTitle id='icon-map-title'>Icons: legacy → Lucide map</SectionTitle>
      <Note>
        Every key of the Lucide registry ({ROWS.length}): the legacy icon (react-icons) at the theme&apos;s three icon sizes, then the base
        <code> Icon</code> at the same sizes. Approximate rows are highlighted and labelled; <em>unused</em> keys have no use in the web.
      </Note>
      <Switcher role='group' aria-label='Filter by match'>
        {FILTERS.map((name) => (
          <Choice key={name} type='button' $on={filter === name} aria-pressed={filter === name} onClick={() => setFilter(name)}>
            {name} ({count(name)})
          </Choice>
        ))}
      </Switcher>
      <Scroller role='region' aria-label='Icon map table' tabIndex={0}>
        <Table data-testid='icon-map'>
          <thead>
            <tr>
              <th scope='col'>Key</th>
              <th scope='col'>Before (legacy: sm, md, lg)</th>
              <th scope='col'>After (Lucide: sm, md, lg)</th>
              <th scope='col'>Match</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ name, kind, unused }) => (
              <Tr key={name} data-name={name} $approximate={kind === 'approximate'}>
                <th scope='row'><code>{name}</code></th>
                <td>
                  <Glyphs aria-hidden='true'>
                    {LEVELS.map((size) => <LegacyIcon key={size} name={name} size={themeIconSize(theme, size)} />)}
                  </Glyphs>
                </td>
                <td>
                  <Glyphs>
                    {LEVELS.map((size) => <Icon key={size} name={name} size={size} />)}
                  </Glyphs>
                </td>
                <td>
                  <Kind $approximate={kind === 'approximate'}>{kind}</Kind>
                  {unused && <Caption> · unused</Caption>}
                </td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Scroller>
    </Section>
  )
}
