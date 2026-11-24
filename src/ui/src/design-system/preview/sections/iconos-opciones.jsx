import React from 'react'
import styled, { useTheme } from 'styled-components'
import {
  ArrowLeftRight,
  ArrowRightLeft,
  ChevronLeft,
  ChevronUp,
  Circle,
  CircleCheck,
  CircleDot,
  CircleX,
  ClipboardList,
  Dot,
  Heart,
  ListChecks,
  LoaderCircle,
  MapPin,
  MapPinned,
  Maximize,
  Maximize2,
  Menu,
  OctagonX,
  Search,
  TextAlignEnd,
  Trophy,
  Wallet,
  createLucideIcon
} from 'lucide-react'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeRadius, themeIconSize, themeSize, themeSpace, themeText } from '~/utils/themeTokens'
import { Icon as LegacyIcon } from '../../../components/Icon'
import { CircleHalf } from '../../../components/Icon/custom/CircleHalf'
import { createIcon } from '../../components/createIcon'
import { Input } from '../../components/Input'
import { Caption, Note, Section, SectionTitle } from '../ui'

// Own glyphs, drawn like Lucide's (24 box, stroke 2, round caps and joins) so
// they take the theme's icon sizes the same way. Hatches: three diagonal
// strokes, a half's inside its half circle, the whole one's across the circle.
const ring = ['circle', { cx: '12', cy: '12', r: '10', key: 'ring' }]
const line = (d, key) => ['path', { d, key }]
const HalfSolidRight = createLucideIcon('HalfSolidRight', [ring, ['path', { d: 'M12 2a10 10 0 0 1 0 20z', fill: 'currentColor', key: 'half' }]])
const HatchLeft = createLucideIcon('HatchLeft', [ring, line('M12 2v20', 'axis'), line('M2.04 12.96 10.5 4.5', 'a'), line('M3.59 17.41 10.5 10.5', 'b'), line('M6.59 20.41 10.5 16.5', 'c')])
const HatchRight = createLucideIcon('HatchRight', [ring, line('M12 2v20', 'axis'), line('M21.96 12.96 13.5 4.5', 'a'), line('M20.41 17.41 13.5 10.5', 'b'), line('M17.41 20.41 13.5 16.5', 'c')])
const HatchWhole = createLucideIcon('HatchWhole', [ring, line('M2.04 12.96 12.96 2.04', 'a'), line('M3.59 17.41 17.41 3.59', 'b'), line('M6.59 20.41 20.41 6.59', 'c')])
const TriangleLeft = createLucideIcon('TriangleLeft', [line('M16 5 7 12l9 7z', 'tri')])
const TriangleUp = createLucideIcon('TriangleUp', [line('M5 16l7-9 7 9z', 'tri')])
const SmallRing = createLucideIcon('SmallRing', [['circle', { cx: '12', cy: '12', r: '4', key: 'ring' }]])

// One local registry for every glyph under test; the three solid ones are filled with the text color.
const GLYPHS = {
  halfLeftSolid: CircleHalf,
  halfRightSolid: HalfSolidRight,
  circleSolid: Circle,
  halfLeftHatch: HatchLeft,
  halfRightHatch: HatchRight,
  wholeHatch: HatchWhole,
  heart: Heart,
  heartSolid: Heart,
  trophy: Trophy,
  trophySolid: Trophy,
  circle: Circle,
  chevronLeft: ChevronLeft,
  chevronUp: ChevronUp,
  triangleLeft: TriangleLeft,
  triangleUp: TriangleUp,
  dot: Dot,
  smallRing: SmallRing,
  circleX: CircleX,
  maximize2: Maximize2,
  octagonX: OctagonX,
  maximize: Maximize,
  search: Search,
  loaderCircle: LoaderCircle,
  clipboardList: ClipboardList,
  listChecks: ListChecks,
  mapPinned: MapPinned,
  mapPin: MapPin,
  textAlignEnd: TextAlignEnd,
  menu: Menu,
  circleDot: CircleDot,
  circleCheck: CircleCheck,
  arrowLeftRight: ArrowLeftRight,
  arrowRightLeft: ArrowRightLeft,
  wallet: Wallet
}
const SOLID = new Set(['circleSolid', 'heartSolid', 'trophySolid'])
const Glyph = createIcon(GLYPHS, SOLID)
const MIRROR = { style: { transform: 'scaleX(-1)' } }
const LEVELS = ['sm', 'md', 'lg']

// ---- furniture (styled-components painted from the theme) ----

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
`

const Group = styled.article`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  padding: ${({ theme }) => themeSpace(theme, 'md')};
  border-radius: ${({ theme }) => themeRadius(theme, 'lg')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border')}`};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
`

const GroupTitle = styled.h3`
  margin: 0;
  ${({ theme }) => themeText(theme, 'h4')}
`

const Pair = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 5)), 1fr));
`

const Option = styled.div`
  display: grid;
  align-content: start;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  min-width: 0;
  padding: ${({ theme }) => themeSpace(theme, 'md')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme, $recommended }) => `${themeBorderWidth(theme, $recommended ? 'thick' : 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, $recommended ? 'primary' : 'border')}`};
`

const OptionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  ${({ theme }) => themeText(theme, 'label')}
`

const Badge = styled.strong`
  padding: ${({ theme }) => `${themeSpace(theme, 'xxs')} ${themeSpace(theme, 'sm')}`};
  border-radius: ${({ theme }) => themeRadius(theme, 'full')};
  background: ${({ theme }) => themeColor(theme, 'primary')};
  color: ${({ theme }) => themeColor(theme, 'on_primary')};
  ${({ theme }) => themeText(theme, 'caption')}
`

const Line = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => `${themeSpace(theme, 'xs')} ${themeSpace(theme, 'md')}`};
`

const Sizes = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
`

const Mock = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  padding: ${({ theme }) => themeSpace(theme, 'md')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
`

const Segments = styled.div`
  display: inline-flex;
  overflow: hidden;
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border_strong')}`};
`

const Item = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  padding: ${({ theme }) => `${themeSpace(theme, 'xs')} ${themeSpace(theme, 'md')}`};
  background: ${({ theme, $on }) => themeColor(theme, $on ? 'primary' : 'surface')};
  color: ${({ theme, $on }) => themeColor(theme, $on ? 'on_primary' : 'text')};
  ${({ theme }) => themeText(theme, 'label')}
`

const Banner = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  padding: ${({ theme }) => `${themeSpace(theme, 'xs')} ${themeSpace(theme, 'md')}`};
  border-radius: ${({ theme, $pill }) => themeRadius(theme, $pill ? 'full' : 'md')};
  background: ${({ theme }) => themeColor(theme, 'primary_subtle')};
  color: ${({ theme }) => themeColor(theme, 'primary_text')};
  ${({ theme }) => themeText(theme, 'label')}
`

const Muted = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
`

const Marker = styled.span`
  color: ${({ theme, $on }) => themeColor(theme, $on ? 'primary_text' : 'text_muted')};
  display: inline-flex;
`

const MapBox = styled.div`
  position: relative;
  width: 100%;
  height: ${({ theme }) => `calc(${themeSize(theme, 'xl')} * 2)`};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  background: ${({ theme }) => themeColor(theme, 'surface')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border')}`};
`

const Corner = styled.span`
  position: absolute;
  inset-block-start: ${({ theme }) => themeSpace(theme, 'sm')};
  inset-inline-end: ${({ theme }) => themeSpace(theme, 'sm')};
  display: inline-flex;
  padding: ${({ theme }) => themeSpace(theme, 'xs')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border_strong')}`};
`

const ChangeStore = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  padding: ${({ theme }) => `${themeSpace(theme, 'xs')} ${themeSpace(theme, 'md')}`};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border_strong')}`};
  color: ${({ theme }) => themeColor(theme, 'primary_text')};
  ${({ theme }) => themeText(theme, 'label')}
`

const Field = styled.div`
  width: 100%;
`

// ---- mockups: the control as the web paints it, each with the glyph under test ----

const g = (name, size = 'md', props) => <Glyph name={name} size={size} {...props} />

const MOCKS = {
  // [left half, whole, right half]; the middle one is the selected segment
  segmented: ([left, whole, right]) => (
    <Segments>
      <Item>{g(left)} Left</Item>
      <Item $on>{g(whole)} Whole</Item>
      <Item>{g(right)} Right</Item>
    </Segments>
  ),
  loyalty: ([heart, trophy]) => (
    <>
      <Banner>{g(heart)} Loyalty points 120</Banner>
      <Banner>{g(trophy)} You earned a reward</Banner>
    </>
  ),
  days: ([caret]) => (
    <Segments>
      <Item>{g(caret)}</Item>
      <Item>November, 2026</Item>
      <Item>{g(caret, 'md', MIRROR)}</Item>
    </Segments>
  ),
  meta: ([dot]) => (
    <Muted>Pizza {g(dot, 'sm')} 25 min {g(dot, 'sm')} 1.2 km</Muted>
  ),
  chipAndMap: ([close, expand]) => (
    <>
      <Banner $pill>SAVE10 {g(close, 'sm')}</Banner>
      <MapBox><Corner>{g(expand)}</Corner></MapBox>
    </>
  ),
  address: ([icon]) => (
    <Field><Input readOnly defaultValue='123 Main Street' aria-label='Address' suffix={g(icon)} /></Field>
  ),
  nav: ([icon], label) => <Item>{g(icon)} {label}</Item>,
  radio: ([off, on]) => (
    <>
      <Marker>{g(off)}</Marker> Pickup
      <Marker $on>{g(on)}</Marker> Delivery
    </>
  ),
  changeStore: ([icon]) => <ChangeStore>{g(icon, 'sm')} Change store</ChangeStore>
}

// ---- the groups ----
// rows: one legacy `before` and one A/B pair each; `rec` is the recommended column.

const GROUPS = [
  {
    id: 'halves',
    title: 'Pizza halves',
    where: 'ProductOptionSubOption: segmented control left / whole / right',
    rec: 'A',
    rows: [{
      before: ['circleHalf', 'circleFill'],
      A: { glyphs: ['halfLeftSolid', 'circleSolid', 'halfRightSolid'], mock: 'segmented', change: 'Keeps the fill: the fill is the data of which half (an exception like the heart and the star). Custom half + solid circle.' },
      B: { glyphs: ['halfLeftHatch', 'wholeHatch', 'halfRightHatch'], mock: 'segmented', change: 'Stroke only: a vertical diameter, and the chosen half marked with 3 diagonal strokes; whole = hatched all over.' }
    }]
  },
  {
    id: 'stillFilled',
    title: 'Still-filled icons that are not favorite or rating',
    where: 'walletLoyalty (points wallet), trophyFilled (rewards banner), circleFill (start of the MaxSectionItem bar)',
    rec: 'A',
    rows: [{
      before: ['walletLoyalty', 'trophyFilled', 'circleFill'],
      A: { glyphs: ['heart', 'trophy', 'circle'], mock: 'loyalty', change: 'Stroke: Heart, Trophy and Circle without fill.' },
      B: { glyphs: ['heartSolid', 'trophySolid', 'circleSolid'], mock: 'loyalty', change: 'They stay filled with the text color (fill currentColor).' }
    }]
  },
  {
    id: 'carets',
    title: 'Carets',
    where: 'caretLeftFill (day carousel arrow of ServiceForm), caretUpFill (Header)',
    rec: 'A',
    rows: [{
      before: ['caretLeftFill', 'caretUpFill'],
      A: { glyphs: ['chevronLeft', 'chevronUp'], mock: 'days', change: 'Lucide ChevronLeft / ChevronUp, as the other chevrons (D6).' },
      B: { glyphs: ['triangleLeft', 'triangleUp'], mock: 'days', change: 'Own triangle, stroke only (no fill).' }
    }]
  },
  {
    id: 'dot',
    title: 'Metadata separator',
    where: 'BusinessController, BusinessListingSearch: «Pizza • 25 min • 1.2 km» (GoDot was a small ring)',
    rec: 'A',
    rows: [{
      before: ['dot'],
      A: { glyphs: ['dot'], mock: 'meta', change: 'Lucide Dot.' },
      B: { glyphs: ['smallRing'], mock: 'meta', change: 'Own small ring, stroke only (circle r=4 in the 24 box).' }
    }]
  },
  {
    id: 'shape',
    title: 'Keys with another shape',
    where: 'closeOctagon (coupon and messages; MdCancel is a circle with an X), fullscreen (tracking map; the old one is diagonal arrows)',
    rec: 'A',
    rows: [{
      before: ['closeOctagon', 'fullscreen'],
      A: { glyphs: ['circleX', 'maximize2'], mock: 'chipAndMap', change: 'CircleX and Maximize2: the shape of the old icons.' },
      B: { glyphs: ['octagonX', 'maximize'], mock: 'chipAndMap', change: 'OctagonX and Maximize: what lucideRegistry has today.' }
    }]
  },
  {
    id: 'searchLoading',
    title: 'Address search while loading',
    where: 'AddressForm search button (at rest it is mapMarker)',
    rec: 'A',
    rows: [{
      before: ['searchLoading'],
      A: { glyphs: ['search'], mock: 'address', change: 'Static Search.' },
      B: { glyphs: ['loaderCircle'], mock: 'address', change: 'Static LoaderCircle (no animation).' }
    }]
  },
  {
    id: 'header',
    title: 'Header area (migrated by I-1303; only the glyph here)',
    where: 'NavigationBar, Header address, RenderProductsLayout',
    rec: 'A',
    rows: [
      { label: 'Orders', key: 'cardChecklist', before: ['cardChecklist'], A: { glyphs: ['clipboardList'], mock: 'nav', change: 'ClipboardList' }, B: { glyphs: ['listChecks'], mock: 'nav', change: 'ListChecks (today)' } },
      { label: 'Address', key: 'pinMapFill', before: ['pinMapFill'], A: { glyphs: ['mapPinned'], mock: 'nav', change: 'MapPinned (today)' }, B: { glyphs: ['mapPin'], mock: 'nav', change: 'MapPin' } },
      { label: 'Menu', key: 'menuAltRight', before: ['menuAltRight'], A: { glyphs: ['textAlignEnd'], mock: 'nav', change: 'TextAlignEnd (today)' }, B: { glyphs: ['menu'], mock: 'nav', change: 'Menu' } }
    ]
  },
  {
    id: 'radio',
    title: 'Single-choice list indicator',
    where: 'styles/Choice: radioChoiceOff / radioChoiceOn',
    rec: 'A',
    rows: [{
      before: ['radioChoiceOff', 'radioChoiceOn'],
      A: { glyphs: ['circle', 'circleDot'], mock: 'radio', change: 'Circle / CircleDot (today).' },
      B: { glyphs: ['circle', 'circleCheck'], mock: 'radio', change: 'Circle / CircleCheck.' }
    }]
  },
  {
    id: 'missingKey',
    title: 'A key in no registry',
    where: 'arrowLeftRight (BusinessInfoComponent:261, «Change store» button, no icon today)',
    rec: 'B',
    rows: [{
      before: [],
      A: { glyphs: ['arrowLeftRight'], mock: 'changeStore', change: 'ArrowLeftRight.' },
      B: { glyphs: ['arrowRightLeft'], mock: 'changeStore', change: 'ArrowRightLeft.' }
    }]
  }
]

const OptionCard = ({ letter, spec, row, recommended }) => {
  const theme = useTheme()
  return (
  <Option data-option={letter} $recommended={recommended}>
    <OptionHead>
      Option {letter}
      {recommended && <Badge>Recommended</Badge>}
    </OptionHead>
    <Line>
      <Caption>Before</Caption>
      {row.before.length ? row.before.map((name) => <LegacyIcon key={name} name={name} size={themeIconSize(theme, 'md')} aria-hidden='true' />) : <Caption>no icon today</Caption>}
    </Line>
    <Line>
      <Caption>Proposed</Caption>
      {spec.glyphs.map((name) => (
        <Sizes key={name}>
          {LEVELS.map((size) => <Glyph key={size} name={name} size={size} />)}
        </Sizes>
      ))}
    </Line>
    <Mock>{MOCKS[spec.mock](spec.glyphs, row.label)}</Mock>
    <Caption>{spec.change}</Caption>
  </Option>
  )
}

export const IconOptionsSection = () => (
  <Section aria-labelledby='icon-options-title'>
    <SectionTitle id='icon-options-title'>Icons without an exact Lucide match: options</SectionTitle>
    <Note>
      One stroke width everywhere: Lucide&apos;s (2). Brand marks only where the web paints the control.
    </Note>
    <Stack>
      {GROUPS.map(({ id, title, where, rec, rows }) => (
        <Group key={id} data-testid={`icon-group-${id}`}>
          <GroupTitle>{title}</GroupTitle>
          <Caption>{where}</Caption>
          {rows.map((row) => (
            <React.Fragment key={row.key || id}>
              {row.label && <strong>{row.label}</strong>}
              <Pair>
                {['A', 'B'].map((letter) => <OptionCard key={letter} letter={letter} spec={row[letter]} row={row} recommended={letter === rec} />)}
              </Pair>
            </React.Fragment>
          ))}
        </Group>
      ))}
    </Stack>
  </Section>
)
