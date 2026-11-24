import React, { useState } from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeBorderStyle, themeBorderWidth, themeControlHeight, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/Dialog'
import { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '../../components/Popover'
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

// the content of a popover has its own room: the piece has no padding
const Body = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  padding: ${({ theme }) => themeSpace(theme, 'lg')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
`

const Options = styled.ul`
  list-style: none;
  margin: 0;
  padding: ${({ theme }) => themeSpace(theme, 'xxs')} 0;
  li {
    padding: ${({ theme }) => `${themeSpace(theme, 'sm')} ${themeSpace(theme, 'lg')}`};
    color: ${({ theme }) => themeColor(theme, 'text')};
    ${({ theme }) => themeText(theme, 'body')}
  }
`

// a header-like bar that scrolls away: its popover keeps to its trigger
const Header = styled.div`
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  padding: ${({ theme }) => `${themeSpace(theme, 'sm')} ${themeSpace(theme, 'md')}`};
  background: ${({ theme }) => themeColor(theme, 'surface')};
  border-bottom: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border')}`};
`

const Filled = ({ title = 'Delivery time', description = 'Pick the moment', children }) => (
  <Body>
    <PopoverTitle>{title}</PopoverTitle>
    <PopoverDescription>{description}</PopoverDescription>
    {children}
    <PopoverClose render={<Action type='button' />}>Done</PopoverClose>
  </Body>
)

const Demo = ({ label, where, content, primary, children }) => (
  <Popover>
    <PopoverTrigger render={<Action type='button' $primary={primary} data-testid={`popover-${where}`} />}>{label}</PopoverTrigger>
    <PopoverContent {...content} data-testid={`popover-${where}-content`}>{children || <Filled />}</PopoverContent>
  </Popover>
)

// opened from inside a dialog, above it (layer='modal')
const InDialog = () => (
  <Dialog>
    <DialogTrigger render={<Action type='button' data-testid='popover-dialog-open' />}>Open a dialog</DialogTrigger>
    <DialogContent size='sm'>
      <DialogHeader>
        <DialogTitle>Delivery details</DialogTitle>
        <DialogDescription>A popover opened here is above the dialog.</DialogDescription>
      </DialogHeader>
      <Demo label='Pick a time' where='in-dialog' content={{ layer: 'modal' }} />
    </DialogContent>
  </Dialog>
)

// controlled: the parent owns the open state, as the header does
const Controlled = () => {
  const [open, setOpen] = useState(false)
  return (
    <Row>
      <Action type='button' data-testid='popover-external' onClick={() => setOpen((value) => !value)}>{open ? 'Close it from outside' : 'Open it from outside'}</Action>
      <Popover open={open} onOpenChange={(next) => setOpen(next)}>
        <PopoverTrigger render={<Action type='button' data-testid='popover-controlled' />}>Controlled</PopoverTrigger>
        <PopoverContent align='end'><Filled title='Your cart' description='Opened and closed by its parent' /></PopoverContent>
      </Popover>
    </Row>
  )
}

export const PopoverSection = () => (
  <Section aria-labelledby='popover-title'>
    <SectionTitle id='popover-title'>Popover</SectionTitle>
    <Note>
      A floating box with the look of the theme&apos;s menu (<code>components.menu</code>; the schema has no popover of its own).
      It closes with Escape, a press outside or its close button, gives the focus back to what opened it, and sits below a
      dialog opened after it. On a phone the header uses a drawer: the same content goes in a sheet.
    </Note>
    <Caption>Below its trigger, centered, as wide as its content</Caption>
    <Row>
      <Demo label='Open' where='default' primary />
      <Demo label='Align end' where='end' content={{ align: 'end' }} />
      <Demo label='Align start' where='start' content={{ align: 'start' }} />
      <Demo label='On top' where='top' content={{ side: 'top' }} />
    </Row>
    <Caption>As wide as the menu&apos;s maximum, or as its trigger</Caption>
    <Row>
      <Demo label='Menu width' where='menu-width' content={{ width: 'menu' }} />
      <Demo label='Trigger width' where='anchor-width' content={{ width: 'anchor' }}>
        <Options><li>Home</li><li>Work</li><li>Mom&apos;s</li></Options>
      </Demo>
    </Row>
    <Caption>Held by its parent (the header&apos;s cart)</Caption>
    <Controlled />
    <Caption>From a bar that stays at the top while the page scrolls: it stays with its trigger</Caption>
    <Header>
      <span>Header</span>
      <Demo label='Cart' where='sticky' content={{ align: 'end', positionMethod: 'fixed' }} />
    </Header>
    <Caption>Over a dialog</Caption>
    <InDialog />
  </Section>
)
