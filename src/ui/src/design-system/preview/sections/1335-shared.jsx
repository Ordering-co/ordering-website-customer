import React, { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeBorderStyle, themeBorderWidth, themeFocusRing, themeIconSize, themePart, themeRadius, themeSpace, themeText, themeValue } from '~/utils/themeTokens'
import { getThemeCss, MOBILE_WEB_MAX_WIDTH } from '~/utils/themeCss'
import { themeSlot } from '~/utils/themeGroups'
import { themeVisible } from '~/utils/themeVisibility'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { Badge } from '~ui/src/styles/Badge'
import { businessCardHeaderHeights, businessCardLogoSizes } from '~ui/src/components/BusinessController/styles'
import { Button } from '../../components/Button'
import { Icon } from '../../components/Icon'
import { Input } from '../../components/Input'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '../../components/Sheet'
import { Caption } from '../ui'

// implementation noteswhat the three options for the business listing share. The
// store card is ONE component that reads the values the store already set for
// its card (`components.business_card`, as BusinessController/styles.js does)
// and takes the header height as a prop: A and C use it, B's compact row reads
// the same keys. All data is made up.

export const CATEGORIES = ['Restaurants', 'Groceries', 'Pharmacy', 'Coffee', 'Alcohol', 'Bakery', 'Flowers']

// time in minutes, price in the store's currency, distance in km, reviews.total 1-5
export const STORES = [
  { id: 1, name: 'Corner Burger House', types: 'Burgers · Fries', delivery_time: 25, pickup_time: 15, delivery_price: 2.99, distance: 1.2, reviews: 4.7, open: true, featured: true, favorite: true },
  { id: 2, name: 'Green Basket Market', types: 'Groceries · Produce', delivery_time: 35, pickup_time: 20, delivery_price: 3.5, distance: 2.4, reviews: 4.5, open: true, featured: true },
  { id: 3, name: 'Sunrise Bakery', types: 'Bakery · Pastries', delivery_time: 20, pickup_time: 10, delivery_price: 1.99, distance: 0.8, reviews: 4.9, open: true, featured: true },
  { id: 4, name: 'Maple Coffee Bar', types: 'Coffee · Sandwiches', delivery_time: 15, pickup_time: 10, delivery_price: 1.5, distance: 0.5, reviews: 4.3, open: true, offer: '20% off' },
  { id: 5, name: 'Harbor Pharmacy', types: 'Pharmacy · Health', delivery_time: 30, pickup_time: 15, delivery_price: 2.5, distance: 1.9, reviews: 4.4, open: true, closesIn: 20 },
  { id: 6, name: 'Golden Noodle Kitchen', types: 'Noodles · Asian', delivery_time: 40, pickup_time: 25, delivery_price: 3.99, distance: 3.1, reviews: 4.6, open: true },
  { id: 7, name: 'Petal & Stem Florist', types: 'Flowers · Gifts', delivery_time: 45, pickup_time: 30, delivery_price: 4.5, distance: 3.8, reviews: 4.8, open: true },
  { id: 8, name: 'Slice Society Pizza', types: 'Pizza · Italian', delivery_time: 35, pickup_time: 20, delivery_price: 2.99, distance: 2.2, reviews: 4.2, open: true },
  { id: 9, name: 'Taco Garden', types: 'Mexican · Tacos', delivery_time: 30, pickup_time: 15, delivery_price: 2.5, distance: 1.6, reviews: 4.1, open: true },
  { id: 10, name: 'Night Owl Spirits', types: 'Alcohol · Snacks', delivery_time: 30, pickup_time: 15, delivery_price: 3.5, distance: 2.7, reviews: 4.4, open: false },
  { id: 11, name: 'Fresh Pick Groceries', types: 'Groceries · Organic', delivery_time: 40, pickup_time: 25, delivery_price: 3.99, distance: 4.3, reviews: 4.6, open: false, preorder: true },
  { id: 12, name: 'Morning Roast Cafe', types: 'Coffee · Breakfast', delivery_time: 20, pickup_time: 10, delivery_price: 1.99, distance: 1.4, reviews: 4.5, open: false }
]

// What the store can filter by today (the search page's filters). Pickup swaps
// "Max delivery time" for "Max pickup time".
const FILTER_GROUPS = [
  { key: 'price', title: 'Price', multi: true, options: ['$', '$$', '$$$', '$$$$'] },
  { key: 'brands', title: 'Brands', multi: true, options: ['Burger Barn', 'Green Co.', 'Roast & Co.', 'Sunny Foods'] },
  { key: 'time', title: 'Max delivery time', options: ['20 min', '30 min', '45 min', '60 min'] },
  { key: 'distance', title: 'Max distance', options: ['1 km', '3 km', '5 km', '10 km'] }
]

export const DESKTOP = 1024

const cardCss = (theme) => getThemeCss(theme, 'business_card').base
const phoneOnly = `@media (max-width: ${MOBILE_WEB_MAX_WIDTH - 1}px)`

// ---------- furniture ----------

export const Frame = styled.div`
  box-sizing: border-box;
  min-width: 0;
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'xl')};
  padding: ${({ theme }) => themeSpace(theme, 'lg')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border')}`};
  background: ${({ theme }) => themeColor(theme, 'background')};
  color: ${({ theme }) => themeColor(theme, 'text')};
`

export const BlockTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => headingText(theme, 'h4')}
`

export const Toolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

const PillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// A pill that can be selected. falta: pieza Chip (PZ-1): composed with Button.
export const Pill = ({ selected = false, ...props }) => (
  <Button size='sm' color={selected ? 'primary' : 'neutral'} appearance={selected ? 'solid' : 'tonal'} aria-pressed={selected} {...props} />
)

export const CategoryPills = () => {
  const [active, setActive] = useState(0)
  return (
    <PillRow role='group' aria-label='Categories'>
      {CATEGORIES.map((name, i) => <Pill key={name} selected={i === active} onClick={() => setActive(i === active ? -1 : i)}>{name}</Pill>)}
    </PillRow>
  )
}

export const SearchField = () => (
  <Input type='search' aria-label='Search stores' placeholder='Search' prefix={<Icon name='search' />} />
)

// ---------- the store card (the theme's, the same one for every option) ----------

// The header's min-height: the listing's (header_height_listing), the plain one
// (header_height) or a hero (the listing's, taller); each with its phone value.
const headerHeightCss = (theme, kind) => {
  const heights = businessCardHeaderHeights(theme)
  const desktop = { listing: heights.listing, standard: heights.size, hero: `calc(${heights.listing} * 1.6)` }[kind]
  const phone = { listing: heights.mobileListing, standard: heights.mobile, hero: `calc(${heights.mobileListing || heights.listing} * 1.2)` }[kind]
  return `&& { min-height: ${desktop}; } ${phone ? `${phoneOnly} { && { min-height: ${phone}; } }` : ''}`
}

const Card = styled.article`
  box-sizing: border-box;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => cardCss(theme).padding};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themePart(theme, 'business_card', { background: 'base.background', border: 'base.border', 'box-shadow': 'base.shadow', 'border-radius': 'base.radius', 'font-family': 'base.font_role' })}
  &:hover {
    ${({ theme }) => themePart(theme, 'business_card', { 'box-shadow': 'variants.default.states.hover.shadow' })}
  }
  @media (min-width: ${DESKTOP}px) {
    ${({ $hero }) => $hero && 'display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);'}
  }
`

// The header bleeds over the card's padding, at the theme's height. Without an
// image (there are none here) it is the header's background; a closed store
// gets the veil (header_overlay) over it.
const Header = styled.div`
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  margin: ${({ theme }) => `calc(${cardCss(theme).padding} * -1) calc(${cardCss(theme).padding} * -1) 0`};
  ${({ theme }) => themePart(theme, 'business_card', { 'background-color': 'base.header_background', 'border-top-left-radius': 'base.radius', 'border-top-right-radius': 'base.radius' })}
  ${({ theme, $closed }) => $closed && `background-image: linear-gradient(${cardCss(theme).header_overlay}, ${cardCss(theme).header_overlay});`}
  ${({ theme, $kind }) => headerHeightCss(theme, $kind)}
  ${({ theme, $skeleton }) => $skeleton && `background: ${themeColor(theme, 'border')};`}
  @media (min-width: ${DESKTOP}px) {
    ${({ theme, $hero }) => $hero && `margin: calc(${cardCss(theme).padding} * -1) 0 calc(${cardCss(theme).padding} * -1) calc(${cardCss(theme).padding} * -1); border-radius: ${cardCss(theme).radius} 0 0 ${cardCss(theme).radius};`}
  }
`

const Initial = styled.span`
  ${({ theme }) => themeText(theme, 'display', { props: ['size', 'weight', 'line', 'family'], weight: 700 })}
  text-transform: uppercase;
  color: ${({ theme, $closed }) => ($closed ? cardCss(theme).status_color : themeColor(theme, 'text_muted'))};
`

const Status = styled.span`
  text-align: center;
  text-transform: uppercase;
  ${({ theme }) => themePart(theme, 'business_card', { text: 'base.status', color: 'base.status_color' })}
`

const ClosingSoon = styled.span`
  text-align: center;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themePart(theme, 'business_card', { text: 'base.status', opacity: 'base.status_opacity' })}
`

const Tags = styled.div`
  position: absolute;
  top: ${({ theme }) => themeSpace(theme, 'sm')};
  left: ${({ theme }) => themeSpace(theme, 'sm')};
  right: ${({ theme }) => themeSpace(theme, 'sm')};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  pointer-events: none;
`

const Crown = styled.span`
  display: inline-flex;
  padding: ${({ theme }) => themeSpace(theme, 'xs')};
  border-radius: ${({ theme }) => themeRadius(theme, 'full')};
  background: ${({ theme }) => themeColor(theme, 'overlay')};
  color: ${({ theme }) => themeColor(theme, 'warning')};
`

const TagGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  margin-inline-start: auto;
`

const Body = styled.div`
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: ${({ $hero }) => ($hero ? 'center' : 'space-between')};
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  padding-top: ${({ theme }) => themeSpace(theme, 'sm')};
  @media (min-width: ${DESKTOP}px) {
    ${({ theme, $hero }) => $hero && `padding: ${themeSpace(theme, 'lg')};`}
  }
`

// the logo goes above the name when the card is too narrow for both
const Info = styled.div`
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

const Logo = styled.div`
  flex: none;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => cardCss(theme).header_background};
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => headingText(theme, 'h3')}
  ${({ theme }) => themePart(theme, 'business_card', { 'border-radius': 'base.radius', border: 'base.border', 'box-shadow': 'base.logo_shadow' })}
  ${({ theme }) => {
    const { size, mobile } = businessCardLogoSizes(theme)
    const box = (value) => `width: ${value}; height: ${value};`
    return `${box(size)} ${mobile ? `${phoneOnly} { ${box(mobile)} }` : ''}`
  }}
  ${({ theme, $skeleton }) => $skeleton && `background: ${themeColor(theme, 'border')};`}
`

const Text = styled.div`
  min-width: 0;
  flex: 1 1 ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 2)`};
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};
`

const NameRow = styled.div`
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// Two lines before it is cut, as the real card does
const Name = styled.h4`
  margin: 0;
  min-width: 0;
  flex: 1 1 auto;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  ${({ theme }) => themePart(theme, 'business_card', { text: 'base.name', color: 'base.name_color' })}
  ${({ theme, $muted }) => $muted && `color: ${themeColor(theme, 'text_muted')};`}
`

const Meta = styled.div`
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => `${themeSpace(theme, 'xxs')} ${themeSpace(theme, 'sm')}`};
  ${({ theme }) => themePart(theme, 'business_card', { text: 'base.meta', color: 'base.meta_color' })}
  svg {
    flex: none;
    ${({ theme }) => themePart(theme, 'business_card', { 'font-size': 'base.meta_icon_size' })}
  }
  ${({ theme, $muted }) => $muted && `color: ${themeColor(theme, 'text_muted')};`}
`

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};
  min-width: 0;
`

const Types = styled.span`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  svg {
    ${({ theme }) => themePart(theme, 'business_card', { color: 'base.bullet_color' })}
  }
`

const Stars = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};
  color: ${({ theme }) => themeValue(theme, 'rating', 'base.color')};
  svg {
    font-size: ${({ theme }) => themeIconSize(theme, 'md')};
  }
`

const Action = styled.div`
  display: flex;
`

const Skel = styled.div`
  height: ${({ theme }) => themeSpace(theme, 'md')};
  width: ${({ $w }) => $w}%;
  border-radius: ${({ theme }) => themeRadius(theme, 'sm')};
  background: ${({ theme }) => themeColor(theme, 'border')};
`

const show = (theme, key) => themeVisible(theme, `business_card.${key}`)

// the rating, honoring business_card.reviews
export const Rating = ({ store }) => {
  const theme = useTheme()
  if (!show(theme, 'reviews')) return null
  return <Stars><Icon name='star' />{store.reviews.toFixed(1)}</Stars>
}

// time, fee and distance, honoring business_card.time / fee / distance
export const Facts = ({ store }) => {
  const theme = useTheme()
  return (
    <>
      {show(theme, 'time') && <MetaItem><Icon name='clock' />{store.delivery_time} min</MetaItem>}
      {show(theme, 'fee') && <MetaItem><Icon name='truckDelivery' />${store.delivery_price.toFixed(2)}</MetaItem>}
      {show(theme, 'distance') && <MetaItem>{store.distance} km</MetaItem>}
    </>
  )
}

// The tags over the header (and in a row): discount, preorder and, in C, the "Featured" label
const StoreTags = ({ store, featuredLabel }) => {
  const theme = useTheme()
  const tag = themeSlot(theme, 'business_card', 'tag')
  const variant = tag?.variant || 'inverse'
  const size = tag?.size || 'sm'
  return (
    <>
      {featuredLabel && show(theme, 'featured') && <Badge $variant='primary' $size={size}>Featured</Badge>}
      {store.offer && show(theme, 'offer') && <Badge $variant={variant} $size={size}>Discount {store.offer}</Badge>}
      {!store.open && store.preorder && show(theme, 'preorder') && <Badge $variant={variant} $size={size}>Preorder</Badge>}
    </>
  )
}

/**
 * The theme's business card. `header`: 'listing' (header_height_listing, the
 * grid's), 'standard' (header_height, a shorter one) or 'hero'. `action`: a
 * control under the facts (the hero's "View store"); `featuredLabel`: C's tag.
 */
export const StoreCard = ({ store, header = 'listing', action, featuredLabel = false }) => {
  const theme = useTheme()
  const closed = !store.open
  const hero = header === 'hero'
  const initial = store.name.charAt(0)
  return (
    <Card $hero={hero} data-testid={`d-1335-card-${store.id}`}>
      <Header $kind={header} $closed={closed} $hero={hero}>
        <Tags>
          {store.featured && show(theme, 'featured') ? <Crown><Icon name='crown' /></Crown> : <span />}
          <TagGroup><StoreTags store={store} featuredLabel={featuredLabel} /></TagGroup>
        </Tags>
        <Initial aria-hidden='true' $closed={closed}>{initial}</Initial>
        {closed && <Status>Closed</Status>}
        {!closed && store.closesIn && show(theme, 'closing_soon') && <ClosingSoon>{store.closesIn} minutes to close</ClosingSoon>}
      </Header>
      <Body $hero={hero}>
        <Info>
          {show(theme, 'logo') && <Logo aria-hidden='true'>{initial}</Logo>}
          <Text>
            <NameRow>
              <Name as='h4' title={store.name}>{store.name}</Name>
              {show(theme, 'favorite') && <Button favorite bleed aria-pressed={!!store.favorite} aria-label='Favorite'><Icon name={store.favorite ? 'heartFilled' : 'heartOutline'} /></Button>}
            </NameRow>
            <Meta>
              <Rating store={store} />
              <Types><Icon name='dot' />{store.types}</Types>
            </Meta>
            <Meta><Facts store={store} /></Meta>
          </Text>
        </Info>
        {action && <Action>{action}</Action>}
      </Body>
    </Card>
  )
}

// ---------- the compact row (B's list, C's "Order for later") ----------

const RowBox = styled.article`
  box-sizing: border-box;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  padding: ${({ theme }) => themeSpace(theme, 'md')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themePart(theme, 'business_card', { background: 'base.background', border: 'base.border', 'box-shadow': 'base.shadow', 'border-radius': 'base.radius', 'font-family': 'base.font_role' })}
  &[data-highlighted] {
    ${({ theme }) => themePart(theme, 'business_card', { 'box-shadow': 'variants.default.states.hover.shadow' })}
    outline: ${({ theme }) => `${themeFocusRing(theme).width} solid ${themeColor(theme, 'primary')}`};
  }
`

const StatusLine = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => `${themeSpace(theme, 'xxs')} ${themeSpace(theme, 'sm')}`};
  ${({ theme }) => themeText(theme, 'label')}
  color: ${({ theme, $tone }) => themeColor(theme, $tone)};
`

/**
 * A compact row: the logo (logo_size), name, types, facts and the status. A
 * closed store is muted and says it can be ordered for later. It has no header
 * image, so business_card.header (the header's height) cannot apply here.
 */
export const StoreRow = ({ store, index, highlighted = false }) => {
  const theme = useTheme()
  const closed = !store.open
  return (
    <RowBox data-highlighted={highlighted || undefined} data-testid={`d-1335-row-${store.id}`}>
      {show(theme, 'logo') && <Logo aria-hidden='true'>{store.name.charAt(0)}</Logo>}
      <Text>
        <NameRow>
          {index && <Badge $variant='neutral' $count aria-hidden='true' style={{ alignSelf: 'baseline' }}>{index}</Badge>}
          <Name as='h4' title={store.name} $muted={closed}>{store.name}</Name>
          {show(theme, 'favorite') && <Button favorite bleed aria-pressed={!!store.favorite} aria-label='Favorite'><Icon name={store.favorite ? 'heartFilled' : 'heartOutline'} /></Button>}
        </NameRow>
        <Meta $muted={closed}><Types>{store.types}</Types></Meta>
        <Meta $muted={closed}><Rating store={store} /><Facts store={store} /></Meta>
        <StatusLine $tone={closed ? 'text_muted' : 'success_text'}>
          {closed ? 'Closed · Order for later' : 'Open'}
          {!closed && store.closesIn && show(theme, 'closing_soon') && <span>· Closes in {store.closesIn} min</span>}
          <StoreTags store={store} featuredLabel={store.featured} />
        </StatusLine>
      </Text>
    </RowBox>
  )
}

// ---------- filters (B and C): the same Sheet ----------

export const useFilters = () => {
  const [selected, setSelected] = useState(['price:$$', 'time:30 min'])
  const toggle = (group, option) => {
    const id = `${group.key}:${option}`
    setSelected((now) => {
      if (now.includes(id)) return now.filter((entry) => entry !== id)
      return [...(group.multi ? now : now.filter((entry) => !entry.startsWith(`${group.key}:`))), id]
    })
  }
  return { selected, toggle, clear: () => setSelected([]), count: selected.length }
}

const Groups = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
`

const GroupLabel = styled.strong`
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'label')}
`

const Group = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

/**
 * "Filters" and its Sheet (side 'right' on a desktop, 'bottom' on a phone). The
 * filters would apply in the listing; today they only lead to the search page.
 * falta: Checkbox / Chip pieces (PZ-1): the options are toggle Buttons.
 */
export const FiltersSheet = ({ filters }) => {
  const { width } = useWindowSize()
  return (
    <Sheet>
      <SheetTrigger render={<Button appearance='outline' color='neutral' aria-label={`Filters, ${filters.count} selected`} data-testid='d-1335-filters' />}>
        <Icon name='filter' />
        Filters
        {filters.count > 0 && <Badge $variant='primary' $count>{filters.count}</Badge>}
      </SheetTrigger>
      <SheetContent side={width >= DESKTOP ? 'right' : 'bottom'} data-testid='d-1335-filters-sheet'>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow the stores that deliver to your address.</SheetDescription>
        </SheetHeader>
        <Groups>
          {FILTER_GROUPS.map((group) => (
            <Group key={group.key} role='group' aria-labelledby={`d-1335-filter-${group.key}`}>
              <GroupLabel id={`d-1335-filter-${group.key}`}>{group.title}</GroupLabel>
              <PillRow>
                {group.options.map((option) => (
                  <Pill key={option} selected={filters.selected.includes(`${group.key}:${option}`)} onClick={() => filters.toggle(group, option)}>{option}</Pill>
                ))}
              </PillRow>
            </Group>
          ))}
        </Groups>
        <SheetFooter>
          <Button appearance='ghost' color='neutral' onClick={filters.clear}>Clear all</Button>
          <SheetClose render={<Button cta />}>Show {STORES.length} stores</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ---------- states (under each mock-up) ----------

const StatesTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => headingText(theme, 'h4')}
`

const States = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 5)`}), 1fr));
`

const State = styled.div`
  min-width: 0;
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  align-content: start;
`

const Empty = styled.div`
  box-sizing: border-box;
  display: grid;
  justify-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  padding: ${({ theme }) => themeSpace(theme, 'lg')};
  text-align: center;
  color: ${({ theme }) => themeColor(theme, 'text')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} dashed ${themeColor(theme, 'border_strong')}`};
  ${({ theme }) => themeText(theme, 'body')}
  svg {
    color: ${({ theme }) => themeColor(theme, 'text_muted')};
    font-size: ${({ theme }) => themeIconSize(theme, 'lg')};
  }
`

const SkeletonList = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// A card or a row as a skeleton, in the layout it will have (bars of the border color)
export const SkeletonCard = ({ header = 'listing' }) => (
  <Card aria-hidden='true'>
    <Header $kind={header} $skeleton />
    <Body>
      <Info>
        <Logo $skeleton />
        <Text><Skel $w={70} /><Skel $w={45} /><Skel $w={60} /></Text>
      </Info>
    </Body>
  </Card>
)

export const SkeletonRow = () => (
  <RowBox aria-hidden='true'>
    <Logo $skeleton />
    <Text><Skel $w={65} /><Skel $w={40} /><Skel $w={55} /></Text>
  </RowBox>
)

export const StatesBlock = ({ skeleton }) => (
  <State>
    <StatesTitle>States</StatesTitle>
    <States>
      <State>
        <Caption>Loading: skeletons in the final layout</Caption>
        <SkeletonList role='status' aria-label='Loading stores'>{skeleton}</SkeletonList>
      </State>
      <State>
        <Caption>Empty, with an address</Caption>
        <Empty>
          <Icon name='shop' />
          <strong>No stores deliver to this address yet</strong>
          <span>Try changing your address or filters.</span>
          <Button appearance='outline'>Change address</Button>
        </Empty>
      </State>
      <State>
        <Caption>Empty, without an address</Caption>
        <Empty>
          <Icon name='geoAlt' />
          <strong>Add your address to see stores</strong>
          <span>We&apos;ll show you the places that deliver to you.</span>
          <Button appearance='outline'>Add address</Button>
        </Empty>
      </State>
      <State>
        <Caption>Error</Caption>
        <Empty role='alert'>
          <Icon name='wifiOff' />
          <strong>We couldn&apos;t load the stores</strong>
          <span>Check your connection and try again.</span>
          <Button appearance='outline'>Try again</Button>
        </Empty>
      </State>
    </States>
  </State>
)
