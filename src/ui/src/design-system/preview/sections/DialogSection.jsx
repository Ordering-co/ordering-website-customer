import React from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeControlHeight, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '../../components/Dialog'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '../../components/Sheet'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme): the
// buttons that open and close, and the content inside the pieces. The pieces
// themselves are the design system's.
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

const Field = styled.label`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'label')}
  input {
    box-sizing: border-box;
    min-height: ${({ theme }) => `${themeControlHeight(theme, 'input', 'md')}px`};
    padding: 0 ${({ theme }) => themeSpace(theme, 'md')};
    border-radius: ${({ theme }) => themeRadius(theme, 'md')};
    border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border_strong')}`};
    background: ${({ theme }) => themeColor(theme, 'surface')};
    color: ${({ theme }) => themeColor(theme, 'text')};
    ${({ theme }) => themeText(theme, 'body')}
  }
`

const Lines = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
`

const Form = () => (
  <Lines>
    <Field>Name<input defaultValue='Ana' /></Field>
    <Field>Notes<input defaultValue='No onions' /></Field>
  </Lines>
)

const Actions = ({ done = 'Save' }) => (
  <>
    <DialogClose render={<Action type='button' />}>Cancel</DialogClose>
    <DialogClose render={<Action type='button' $primary />}>{done}</DialogClose>
  </>
)

const Basic = ({ label, testid, size, phone, flush, ...root }) => (
  <Dialog {...root}>
    <DialogTrigger render={<Action type='button' data-testid={`${testid}-trigger`} />}>{label}</DialogTrigger>
    <DialogContent size={size} phone={phone} flush={flush} data-testid={testid}>
      <DialogHeader>
        <DialogTitle>Delivery details</DialogTitle>
        <DialogDescription>Where and when should we bring your order?</DialogDescription>
      </DialogHeader>
      <Form />
      <DialogFooter><Actions /></DialogFooter>
    </DialogContent>
  </Dialog>
)

const Long = () => (
  <Dialog>
    <DialogTrigger render={<Action type='button' data-testid='long-trigger' />}>Long content</DialogTrigger>
    <DialogContent size='lg' data-testid='long'>
      <DialogHeader>
        <DialogTitle>Allergens and ingredients</DialogTitle>
        <DialogDescription>The content scrolls; the close stays where it is.</DialogDescription>
      </DialogHeader>
      <Lines>
        {Array.from({ length: 24 }, (_, i) => <p key={i} style={{ margin: 0 }}>Ingredient {i + 1}: sourced locally, may contain traces of nuts.</p>)}
      </Lines>
      <DialogFooter><Actions done='Got it' /></DialogFooter>
    </DialogContent>
  </Dialog>
)

const Side = ({ side }) => (
  <Sheet>
    <SheetTrigger render={<Action type='button' data-testid={`sheet-${side}-trigger`} />}>Sheet {side}</SheetTrigger>
    <SheetContent side={side} data-testid={`sheet-${side}`}>
      <SheetHeader>
        <SheetTitle>Choose a time</SheetTitle>
        <SheetDescription>Pick when you want your order.</SheetDescription>
      </SheetHeader>
      <Form />
      <SheetFooter><Actions done='Apply' /></SheetFooter>
    </SheetContent>
  </Sheet>
)

// A sheet opened from a dialog sits above it
const Nested = () => (
  <Dialog>
    <DialogTrigger render={<Action type='button' data-testid='nested-trigger' />}>Dialog, then sheet</DialogTrigger>
    <DialogContent data-testid='nested'>
      <DialogHeader><DialogTitle>Payment</DialogTitle></DialogHeader>
      <Sheet>
        <SheetTrigger render={<Action type='button' data-testid='nested-sheet-trigger' />}>Change method</SheetTrigger>
        <SheetContent data-testid='nested-sheet'>
          <SheetHeader><SheetTitle>Payment method</SheetTitle></SheetHeader>
          <Lines><span>Card ending 4242</span></Lines>
        </SheetContent>
      </Sheet>
    </DialogContent>
  </Dialog>
)

export const DialogSection = () => (
  <Section aria-labelledby='dialog-title'>
    <SectionTitle id='dialog-title'>Dialog and Sheet</SectionTitle>
    <Note>
      Both read <code>components.modal</code> (size, radius, background, overlay, shadow, padding, title, motion) and the
      button of its close slot, from the theme the context gives, so they follow the theme, a group&apos;s scope and a hot
      change. Sheets come from the bottom (a phone&apos;s) or a side.
    </Note>
    <Caption>Dialog</Caption>
    <Row>
      <Basic label='Dialog (md)' testid='dialog' />
      <Basic label='Dialog (xl)' testid='dialog-xl' size='xl' />
      <Basic label='Dialog, sheet on a phone' testid='dialog-sheet' phone='sheet' />
      <Basic label='Dialog, centered card on a phone (alert)' testid='dialog-center' size='sm' phone='center' />
      <Basic label='Dialog, flush body (an image, a cover)' testid='dialog-flush' size='md' flush />
      <Basic label='Dialog, no outside press' testid='dialog-sticky' disablePointerDismissal />
      <Long />
      <Nested />
    </Row>
    <Caption>Sheet</Caption>
    <Row>
      <Side side='bottom' />
      <Side side='right' />
      <Side side='left' />
    </Row>
    <Caption>Opened from inside the header group (its buttons are the group&apos;s)</Caption>
    <Row>
      <ComponentScope group='header'>
        <Basic label='Dialog in header scope' testid='scoped' />
      </ComponentScope>
    </Row>
  </Section>
)
