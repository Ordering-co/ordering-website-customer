import React, { useState } from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Note, Section, SectionTitle } from '../ui'
import { CategoryPills, DESKTOP, Frame, FiltersSheet, SearchField, SkeletonRow, StatesBlock, StoreRow, STORES, Toolbar, useFilters } from './1335-shared'

// implementation notes · B: list and map. From 1024 px two columns (the list, and a
// sticky map); below, a List | Map switch shows one at a time. "Filters" opens
// the shared Sheet (a side sheet on a desktop, a bottom one on a phone).

const HIGHLIGHTED = 1 // the row under the pointer: its pin is bigger

// where each store sits on the map, as a share of the panel (map coordinates, not a design value)
const PINS = [[18, 26], [44, 14], [70, 24], [30, 48], [56, 42], [82, 50], [20, 74], [46, 68], [72, 78], [88, 22], [10, 52], [60, 90]]

const Layout = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'switch' 'top' 'main';
  @media (min-width: ${DESKTOP}px) {
    gap: ${({ theme }) => `${themeSpace(theme, 'md')} ${themeSpace(theme, 'lg')}`};
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    grid-template-areas: 'top map' 'list map';
    grid-template-rows: auto 1fr;
    align-items: start;
  }
`

const Switch = styled.div`
  grid-area: switch;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  @media (min-width: ${DESKTOP}px) {
    display: none;
  }
`

const Top = styled.div`
  grid-area: top;
  min-width: 0;
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

const List = styled.div`
  grid-area: main;
  min-width: 0;
  display: ${({ $view }) => ($view === 'list' ? 'grid' : 'none')};
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  @media (min-width: ${DESKTOP}px) {
    grid-area: list;
    display: grid;
  }
`

// sticky: it stays in view while the list scrolls
const MapPane = styled.div`
  grid-area: main;
  display: ${({ $view }) => ($view === 'map' ? 'block' : 'none')};
  @media (min-width: ${DESKTOP}px) {
    grid-area: map;
    display: block;
    position: sticky;
    top: ${({ theme }) => themeSpace(theme, 'lg')};
  }
`

const MapBox = styled.div`
  position: relative;
  box-sizing: border-box;
  height: ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 9)`};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border')}`};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  @media (min-width: ${DESKTOP}px) {
    height: ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 12)`};
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    fill: none;
    stroke: ${({ theme }) => themeColor(theme, 'border')};
    stroke-width: ${({ theme }) => themeBorderWidth(theme, 'thick', { fixed: true })};
    stroke-linecap: round;
  }
  svg .main {
    stroke: ${({ theme }) => themeColor(theme, 'border_strong')};
  }
  svg .block {
    fill: ${({ theme }) => themeColor(theme, 'surface')};
    stroke: none;
  }
`

const Pin = styled.span`
  position: absolute;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  width: ${({ theme, $active }) => themeSpace(theme, $active ? 'xxl' : 'xl')};
  height: ${({ theme, $active }) => themeSpace(theme, $active ? 'xxl' : 'xl')};
  transform: translate(-50%, -50%);
  z-index: ${({ $active }) => ($active ? 1 : 0)};
  border-radius: ${({ theme }) => themeRadius(theme, 'full')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thick', { fixed: true })} solid ${themeColor(theme, 'surface')}`};
  background: ${({ theme }) => themeColor(theme, 'primary')};
  color: ${({ theme }) => themeColor(theme, 'on_primary')};
  ${({ theme }) => themeText(theme, 'caption', { weight: 700 })}
`

// A map drawn with SVG: streets as strokes of the border color, blocks of the surface.
// falta: map provider (real tiles and coordinates); this is a drawing.
const MapPanel = () => (
  <MapBox role='img' aria-label={`Map with ${STORES.length} numbered stores`}>
    <svg viewBox='0 0 100 100' preserveAspectRatio='none' aria-hidden='true' focusable='false'>
      <rect className='block' x='4' y='6' width='34' height='30' />
      <rect className='block' x='46' y='56' width='46' height='34' />
      <rect className='block' x='62' y='8' width='30' height='28' />
      <path className='main' vectorEffect='non-scaling-stroke' d='M0 40 L100 46' />
      <path className='main' vectorEffect='non-scaling-stroke' d='M40 0 L36 100' />
      <path vectorEffect='non-scaling-stroke' d='M0 70 L100 64' />
      <path vectorEffect='non-scaling-stroke' d='M0 14 L100 20' />
      <path vectorEffect='non-scaling-stroke' d='M72 0 L78 100' />
      <path vectorEffect='non-scaling-stroke' d='M12 0 L16 100' />
      <path vectorEffect='non-scaling-stroke' d='M0 92 L100 86' />
    </svg>
    {PINS.map(([x, y], i) => (
      <Pin key={STORES[i].id} aria-hidden='true' $active={i === HIGHLIGHTED} style={{ left: `${x}%`, top: `${y}%` }}>{i + 1}</Pin>
    ))}
  </MapBox>
)

export const Listing1335BSection = () => {
  const [view, setView] = useState('list')
  const filters = useFilters()
  return (
    <Section id='d-1335-b' aria-labelledby='d-1335-b-title' data-testid='d-1335-b'>
      <SectionTitle id='d-1335-b-title'>implementation notes · B · List and map (list_map) · parked, not implemented</SectionTitle>
      <Note>
        Parked by Sergio as a later improvement (implementation notes implemented grid and showcase). Two columns from 1024 px (the list, a sticky map); on a phone a List | Map switch shows one of them. Compact rows
        replace the cards. New capabilities: Filters apply in the listing through a Sheet (today they only go to the search
        page, so the list needs filtering client or API side), and the map needs each store&apos;s coordinates and a map
        provider. A guest who taps a heart gets the login.
      </Note>
      <Frame>
        <Layout>
          <Switch role='group' aria-label='View'>
            <Button appearance={view === 'list' ? 'solid' : 'tonal'} color={view === 'list' ? 'primary' : 'neutral'} aria-pressed={view === 'list'} onClick={() => setView('list')}>List</Button>
            <Button appearance={view === 'map' ? 'solid' : 'tonal'} color={view === 'map' ? 'primary' : 'neutral'} aria-pressed={view === 'map'} onClick={() => setView('map')}><Icon name='map' />Map</Button>
          </Switch>
          <Top>
            <Toolbar>
              <SearchField />
              <FiltersSheet filters={filters} />
            </Toolbar>
            <CategoryPills />
          </Top>
          <List $view={view}>
            {STORES.map((store, i) => <StoreRow key={store.id} store={store} index={i + 1} highlighted={i === HIGHLIGHTED} />)}
          </List>
          <MapPane $view={view}><MapPanel /></MapPane>
        </Layout>
      </Frame>
      <StatesBlock skeleton={<><SkeletonRow /><SkeletonRow /><SkeletonRow /></>} />
    </Section>
  )
}
