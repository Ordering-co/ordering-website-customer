import React from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeControlHeight, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '../../components/Sheet'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme): the
// buttons that open and close, and the content inside. The sheets are the design system's.
const Action = styled.button`
  cursor: pointer;
  box-sizing: border-box;
  min-height: ${({ theme }) => `${themeControlHeight(theme, 'button', 'md')}px`};
  padding: 0 ${({ theme }) => themeSpace(theme, 'lg')};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)}`} ${({ theme, $primary }) => themeColor(theme, $primary ? 'primary' : 'border_strong')};
  background: ${({ theme, $primary }) => themeColor(theme, $primary ? 'primary' : 'surface')};
  color: ${({ theme, $primary }) => themeColor(theme, $primary ? 'on_primary' : 'text')};
  ${({ theme }) => themeText(theme, 'button')}
`

const Lines = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
  p { margin: 0; }
`

const COPY = {
  bottom: { title: 'Allergens and ingredients', description: 'Drag it down by the handle, or by its content from the top of the scroll.' },
  right: { title: 'Your order', description: 'Drag it to the right to close it.' },
  left: { title: 'Menu', description: 'Drag it to the left to close it.' }
}

const Side = ({ side, lines }) => (
  <Sheet>
    <SheetTrigger render={<Action type='button' data-testid={`sheetdrag-${side}-trigger`} />}>Sheet {side}</SheetTrigger>
    <SheetContent side={side} data-testid={`sheetdrag-${side}`}>
      <SheetHeader>
        <SheetTitle>{COPY[side].title}</SheetTitle>
        <SheetDescription>{COPY[side].description}</SheetDescription>
      </SheetHeader>
      <Lines>
        {Array.from({ length: lines }, (_, i) => <p key={i}>Ingredient {i + 1}: sourced locally, may contain traces of nuts.</p>)}
      </Lines>
      <SheetFooter><SheetClose render={<Action type='button' $primary />}>Done</SheetClose></SheetFooter>
    </SheetContent>
  </Sheet>
)

export const SheetDragSection = () => (
  <Section aria-labelledby='sheetdrag-title'>
    <SectionTitle id='sheetdrag-title'>Sheet: drag to dismiss</SectionTitle>
    <Note>
      Every sheet closes by dragging it toward its edge (down, to the right or to the left): past half of its size, or
      fast enough; otherwise it goes back. A finger drags from anywhere, and a scrolling content scrolls first; a mouse
      drags by the handle of a bottom sheet. The close button, Escape and a press outside still work and are the way
      with a keyboard. With reduced motion the drag follows the pointer but nothing animates, not even the return.
    </Note>
    <Caption>The bottom sheet has a long content that scrolls</Caption>
    <Row>
      <Side side='bottom' lines={30} />
    </Row>
    <Caption>Side sheets</Caption>
    <Row>
      <Side side='right' lines={4} />
      <Side side='left' lines={4} />
    </Row>
  </Section>
)
