import React from 'react'
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { getThemeCss } from '~/utils/themeCss'
import { scopedTheme } from '~/utils/themeGroups'
import { themeSpace, themeValue } from '~/utils/themeTokens'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { THEMES } from '../../preview/themes'
import { componentVars } from '../../lib/componentVars'
import { Button } from '../Button'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, closeButtonProps
} from '../Dialog'

const [defaults, grill, cafe, typefaces] = THEMES.map(({ theme }) => theme)

const Demo = ({ theme = defaults, content, root, children }) => (
  <ThemeProvider theme={theme}>
    <Dialog {...root}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent {...content}>
        <DialogHeader>
          <DialogTitle>Delivery details</DialogTitle>
          <DialogDescription>Where should we bring it?</DialogDescription>
        </DialogHeader>
        <input aria-label='Name' />
        {children}
        <DialogFooter><DialogClose>Done</DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  </ThemeProvider>
)

const open = async () => {
  const trigger = screen.getByText('Open')
  trigger.focus()
  fireEvent.click(trigger)
  return { trigger, dialog: await screen.findByRole('dialog') }
}
const portalOf = (el) => el.closest('[data-base-ui-portal]')
const gone = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

describe('Dialog: behaviour', () => {
  it('opens from its trigger and closes with the close button, with its name translated', async () => {
    render(<Demo />)
    expect(screen.queryByRole('dialog')).toBeNull()
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await gone()
  })

  it('is a dialog named by its title and described by its description', async () => {
    render(<Demo />)
    const { dialog } = await open()
    expect(dialog).toHaveAccessibleName('Delivery details')
    expect(dialog).toHaveAccessibleDescription('Where should we bring it?')
    expect(dialog.getAttribute('aria-labelledby')).toBe(screen.getByText('Delivery details').id)
    expect(dialog.getAttribute('aria-describedby')).toBe(screen.getByText('Where should we bring it?').id)
  })

  it('moves the focus in, closes with Escape and gives the focus back to what opened it', async () => {
    render(<Demo />)
    const { trigger, dialog } = await open()
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await gone()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('a press outside closes it, unless the root says it does not', async () => {
    const { unmount } = render(<Demo />)
    await open()
    const overlay = () => document.querySelector('[data-slot=dialog-overlay]')
    fireEvent.pointerDown(overlay())
    fireEvent.click(overlay())
    await gone()
    unmount()

    render(<Demo root={{ disablePointerDismissal: true }} />)
    await open()
    fireEvent.pointerDown(overlay())
    fireEvent.click(overlay())
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Escape still closes it
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await gone()
  })

  it('a modal dialog hides what is outside it from assistive technology', async () => {
    render(<Demo />)
    await open()
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull()
  })

  it('showCloseButton={false} leaves no close button and no room reserved for it', async () => {
    render(<Demo content={{ showCloseButton: false }} />)
    const { dialog } = await open()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect(portalOf(dialog).style.getPropertyValue('--ui-dialog-close-room')).toBe('')
  })
})

describe('Dialog: the theme', () => {
  it('the portalized popup, backdrop and viewport hang from one element that carries components.modal', async () => {
    render(<Demo theme={grill} />)
    const { dialog } = await open()
    const portal = portalOf(dialog)
    expect(portal.parentElement).toBe(document.body)
    expect(portal.contains(document.querySelector('[data-slot=dialog-overlay]'))).toBe(true)
    const vars = componentVars(grill, 'modal', {})
    Object.entries(vars).forEach(([name, value]) => expect(portal.style.getPropertyValue(name)).toBe(value))
    const view = getThemeCss(grill, 'modal')
    expect(portal.style.getPropertyValue('--ui-modal-radius')).toBe(view.base.radius)
    expect(portal.style.getPropertyValue('--ui-modal-overlay')).toBe(view.base.overlay)
    expect(portal.style.getPropertyValue('--ui-modal-background')).toBe(view.base.background)
    expect(portal.style.getPropertyValue('--ui-modal-width')).toBe(view.sizes.md.width)
  })

  it('another theme, another look; the size is the theme\'s width of that size', async () => {
    const { unmount } = render(<Demo theme={grill} content={{ size: 'xl' }} />)
    const grillPortal = portalOf((await open()).dialog)
    expect(grillPortal.style.getPropertyValue('--ui-modal-width')).toBe(getThemeCss(grill, 'modal').sizes.xl.width)
    // (the engine's view decides the radius: a partial theme is not re-derived by Identity)
    expect(grillPortal.style.getPropertyValue('--ui-modal-radius')).toBe(getThemeCss(grill, 'modal').base.radius)
    expect(grillPortal.style.getPropertyValue('--ui-modal-background')).toBe(getThemeCss(grill, 'modal').base.background)
    unmount()

    render(<Demo theme={cafe} content={{ size: 'sm' }} />)
    const cafePortal = portalOf((await open()).dialog)
    expect(cafePortal.style.getPropertyValue('--ui-modal-width')).toBe(getThemeCss(cafe, 'modal').sizes.sm.width)
    expect(cafePortal.style.getPropertyValue('--ui-modal-background')).toBe(getThemeCss(cafe, 'modal').base.background)
    expect(cafePortal.style.getPropertyValue('--ui-modal-radius')).toBe(getThemeCss(cafe, 'modal').base.radius)
  })

  // the close is a Button of its own: its variables are on it, never on the portal where every other Button inherits them
  const closeButton = () => screen.getByRole('button', { name: 'Close' })
  const buttonVarsOf = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--ui-button-')).map((name) => [name, el.style.getPropertyValue(name)]))

  it('opened from inside a group, the close is the group\'s button (the context crosses the portal)', async () => {
    const global = render(<Demo theme={grill} />)
    await open()
    expect(closeButton().style.getPropertyValue('--ui-button-height')).toBe('46px')
    global.unmount()

    render(<ThemeProvider theme={grill}><ComponentScope group='header'><Demo theme={undefined} /></ComponentScope></ThemeProvider>)
    const scoped = portalOf((await open()).dialog)
    expect(scoped.parentElement).toBe(document.body)
    expect(closeButton().style.getPropertyValue('--ui-button-height')).toBe('34px')
    const slot = { size: 'md', color: 'neutral', appearance: 'ghost', shape: 'icon' }
    expect(buttonVarsOf(closeButton())).toEqual(componentVars(scopedTheme(grill, 'header'), 'button', slot))
  })

  it('the close is the button of the modal\'s close slot, with its variables on itself and none on the portal', async () => {
    const theme = buildAppTheme(null, { version: 2, values: { components: { modal: { slots: { close: { size: 'lg', color: 'primary', appearance: 'solid' } } } } } })
    render(<Demo theme={theme} />)
    const portal = portalOf((await open()).dialog)
    const slot = componentVars(theme, 'button', { size: 'lg', color: 'primary', appearance: 'solid', shape: 'icon' })
    expect(slot['--ui-button-background']).not.toBe(componentVars(defaults, 'button', { size: 'md', color: 'neutral', appearance: 'ghost', shape: 'icon' })['--ui-button-background'])
    expect(buttonVarsOf(closeButton())).toEqual(slot)
    expect(closeButton().getAttribute('data-slot')).toBe('dialog-close-button')
    expect(buttonVarsOf(portal)).toEqual({})
    // the title leaves room for it: its height and a gap
    expect(portal.style.getPropertyValue('--ui-dialog-close-room')).toBe(`calc(${slot['--ui-button-height']} + ${themeSpace(theme, 'md')})`)
  })

  it('another Button in the dialog has the look of components.button, not the close\'s', async () => {
    render(<Demo theme={grill}><Button color='primary'>Save</Button></Demo>)
    await open()
    expect(buttonVarsOf(screen.getByRole('button', { name: 'Save' }))).toEqual(componentVars(grill, 'button', { size: 'md', color: 'primary', appearance: 'solid' }))
  })

  it('the close has the touch floor of every Button (a phone and a touch screen), and the icon is the one glyph, not the whole registry', async () => {
    render(<Demo />)
    await open()
    expect(closeButton().className).toContain('ui:pointer-coarse:after:min-h-[44px]')
    expect(closeButton().className).toContain('ui:max-mobile:after:min-h-[44px]')
    expect(closeButton().querySelector('svg').getAttribute('class')).toContain('lucide-x')
  })

  it('the typefaces fixture gives the modal title, the button and the field a text of their own (the browser spec asserts which wins)', () => {
    const own = (theme, group, key, selection = {}) => componentVars(theme, group, selection)[key]
    expect(own(typefaces, 'modal', '--ui-modal-title-family')).toContain('Playfair Display')
    expect(own(typefaces, 'modal', '--ui-modal-title-size')).toBe('18px')
    expect(own(typefaces, 'button', '--ui-button-text-family', { size: 'md' })).toContain('Playfair Display')
    expect(own(typefaces, 'input', '--ui-input-text-family')).toContain('Playfair Display')
    // a theme that names no font for it paints the headings' font, so the title is what the global h2 rule gave it
    expect(own(defaults, 'modal', '--ui-modal-title-family')).toContain('Montserrat')
  })

  it('its motion is the modal\'s: 0ms when the theme does not animate', async () => {
    const still = buildAppTheme(null, { version: 2, values: { tokens: { motion_style: { enabled: false } } } })
    render(<Demo theme={still} />)
    expect(portalOf((await open()).dialog).style.getPropertyValue('--ui-modal-motion-duration')).toBe('0ms')
  })

  it('a phone: the modal fills the screen by default, or comes up as a sheet when asked; no literal in a class', async () => {
    const phone = { ...cafe, platform: 'mobile_web' }
    const { unmount } = render(<Demo theme={phone} />)
    const screenDialog = (await open()).dialog
    // the phone's own radius (a full-screen modal is square) and the classes that fill the screen
    expect(portalOf(screenDialog).style.getPropertyValue('--ui-modal-radius')).toBe('0px')
    expect(screenDialog.className).toContain('ui:max-mobile:h-full')
    expect(screenDialog.className).toContain('ui:max-mobile:w-full')
    unmount()

    render(<Demo theme={phone} content={{ phone: 'sheet' }} />)
    const sheetDialog = (await open()).dialog
    expect(sheetDialog.className).toContain('ui:max-mobile:data-starting-style:translate-y-full')
    expect(sheetDialog.className).not.toContain('ui:max-mobile:h-full')
    expect(sheetDialog.parentElement.className).toContain('ui:max-mobile:items-end')
    // a sheet keeps the modal's own radius, not the phone's square one
    expect(portalOf(sheetDialog).style.getPropertyValue('--ui-modal-radius')).toBe(getThemeCss(cafe, 'modal').base.radius)
  })

  it('a phone, `center` (implementation notes, the legacy Alert): a centered card lg from each side, the modal\'s own radius', async () => {
    const phone = { ...cafe, platform: 'mobile_web' }
    render(<Demo theme={phone} content={{ phone: 'center' }} />)
    const card = (await open()).dialog
    expect(card.className).not.toContain('ui:max-mobile:h-full')
    expect(card.className).not.toContain('ui:max-mobile:w-full')
    expect(card.className).not.toContain('translate-y-full')
    expect(card.parentElement.className).toContain('ui:max-mobile:p-lg')
    expect(card.parentElement.className).not.toContain('ui:max-mobile:items-end')
    // not also the full-screen variant's p-none: the stylesheet's order would decide between them
    expect(card.parentElement.className).not.toContain('ui:max-mobile:p-none')
    expect(portalOf(card).style.getPropertyValue('--ui-modal-radius')).toBe(getThemeCss(cafe, 'modal').base.radius)
  })
})

describe('Dialog: flush', () => {
  const bodyOf = (dialog) => dialog.querySelector(':scope > div:not([data-slot=band-edge])')

  it('without flush, the body has the modal\'s padding, as before', async () => {
    render(<Demo />)
    const body = bodyOf((await open()).dialog)
    expect(body.className).toContain('ui:px-(--ui-modal-padding)')
    expect(body.className).toContain('ui:pt-(--ui-modal-padding-top)')
    expect(body.className).not.toContain('ui:p-none')
  })

  it('the body pads what the keyboard covers, so it keeps its size and the content scrolls above it', async () => {
    render(<Demo />)
    const { dialog } = await open()
    expect(bodyOf(dialog).className).toContain('var(--keyboard-inset,0px)')
    expect(dialog.parentElement.getAttribute('style')).toBeNull()
  })

  it('the body publishes its bottom padding for its content as --layer-pad-bottom, without the keyboard\'s room', async () => {
    render(<Demo />)
    const body = bodyOf((await open()).dialog)
    // the variable is the modal's padding alone: a bar at the bottom reaches the edge, the keyboard still pads above it
    expect(body.className).toContain('ui:[--layer-pad-bottom:var(--ui-modal-padding)]')
    expect(body.className).not.toMatch(/--layer-pad-bottom:[^\s]*keyboard-inset/)
    // after the content comes that padding alone: the content drops the end space of its own
    expect(body.className).toContain('ui:[--layer-end-gap:0px]')
  })

  it('a flush body has no padding to give back: --layer-pad-bottom is 0', async () => {
    render(<Demo content={{ flush: true }} />)
    const body = bodyOf((await open()).dialog)
    expect(body.className).toContain('ui:[--layer-pad-bottom:0px]')
    expect(body.className).not.toContain('--layer-pad-bottom:var(--ui-modal-padding)')
    expect(body.className).toContain('ui:[--layer-end-gap:0px]')
  })

  it('flush (implementation notes, the legacy padding=0): no padding, still the scrolling body, only one padding in the list', async () => {
    render(<Demo content={{ flush: true }} />)
    const body = bodyOf((await open()).dialog)
    expect(body.className).toContain('ui:overflow-y-auto')
    // no padding of the modal's, only the room of the keyboard
    expect(body.className).not.toContain('--ui-modal-padding')
    expect(body.className).toContain('ui:pb-[var(--keyboard-inset,0px)]')
    // the close is still there, over the content
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  })
})

describe('Dialog: width', () => {
  const widthOf = (dialog) => portalOf(dialog).style.getPropertyValue('--ui-modal-width')

  it('without width, the portal carries the size\'s width, as before', async () => {
    render(<Demo theme={grill} content={{ size: 'xl' }} />)
    expect(widthOf((await open()).dialog)).toBe(getThemeCss(grill, 'modal').sizes.xl.width)
  })

  it('a number is the theme\'s width in px, over the size\'s', async () => {
    render(<Demo theme={grill} content={{ size: 'xl', width: 830 }} />)
    expect(widthOf((await open()).dialog)).toBe('830px')
  })

  it('a product_modal width read from the theme is what the portal gets', async () => {
    const theme = buildAppTheme(null, { version: 2, values: { components: { product_modal: { base: { width: 700 } } } } })
    render(<Demo theme={theme} content={{ width: themeValue(theme, 'product_modal', 'base.width') }} />)
    expect(widthOf((await open()).dialog)).toBe('700px')
  })

  it('a string is a CSS width as given (80% for a kiosk)', async () => {
    render(<Demo content={{ width: '80%' }} />)
    expect(widthOf((await open()).dialog)).toBe('80%')
  })

  it('width changes only --ui-modal-width: the rest of the portal\'s variables are those of no width', async () => {
    const { unmount } = render(<Demo theme={cafe} />)
    const base = portalOf((await open()).dialog).style.cssText
    unmount()
    render(<Demo theme={cafe} content={{ width: 830 }} />)
    expect(portalOf((await open()).dialog).style.cssText).toBe(base.replace(/--ui-modal-width: [^;]+;/, '--ui-modal-width: 830px;'))
  })
})

describe('Dialog: closeGroup', () => {
  const closeButton = () => screen.getByRole('button', { name: 'Close' })
  const buttonVarsOf = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--ui-button-')).map((name) => [name, el.style.getPropertyValue(name)]))
  const slot = (size, color, appearance) => ({ size, color, appearance, shape: 'icon' })
  const themed = (slots) => buildAppTheme(null, { version: 2, values: { components: slots } })

  it('without closeGroup, or with \'modal\', the dialog is exactly what it was', async () => {
    const theme = themed({ modal: { slots: { close: { size: 'lg' } } }, product_modal: { slots: { close: { size: 'sm' } } } })
    const snapshot = async (content) => {
      const { unmount } = render(<Demo theme={theme} content={content} />)
      const { dialog } = await open()
      const taken = [portalOf(dialog).style.cssText, closeButton().style.cssText, closeButton().className, dialog.className]
      unmount()
      return taken
    }
    const before = await snapshot(undefined)
    expect(before[1]).toContain(componentVars(theme, 'button', slot('lg', 'neutral', 'ghost'))['--ui-button-height'])
    expect(await snapshot({ closeGroup: undefined })).toEqual(before)
    expect(await snapshot({ closeGroup: 'modal' })).toEqual(before)
  })

  it('product_modal: the close is the button of that group\'s slot, and the title\'s room is its height', async () => {
    const theme = themed({ product_modal: { slots: { close: { size: 'lg', color: 'primary', appearance: 'outline' } } } })
    render(<Demo theme={theme} content={{ closeGroup: 'product_modal' }} />)
    const portal = portalOf((await open()).dialog)
    const mine = componentVars(theme, 'button', slot('lg', 'primary', 'outline'))
    expect(buttonVarsOf(closeButton())).toEqual(mine)
    expect(buttonVarsOf(closeButton())).not.toEqual(componentVars(theme, 'button', slot('md', 'neutral', 'ghost')))
    expect(buttonVarsOf(portal)).toEqual({})
    expect(portal.style.getPropertyValue('--ui-dialog-close-room')).toBe(`calc(${mine['--ui-button-height']} + ${themeSpace(theme, 'md')})`)
  })

  it('product_modal without a store change: the schema\'s slot, not the modal\'s defaults (md solid neutral)', async () => {
    render(<Demo content={{ closeGroup: 'product_modal' }} />)
    await open()
    expect(buttonVarsOf(closeButton())).toEqual(componentVars(defaults, 'button', slot('md', 'neutral', 'solid')))
    expect(buttonVarsOf(closeButton())).not.toEqual(componentVars(defaults, 'button', slot('md', 'neutral', 'ghost')))
  })

  it('each group has its own: the modal\'s slot does not reach product_modal\'s and the other way round', async () => {
    const theme = themed({ modal: { slots: { close: { size: 'xs', color: 'danger', appearance: 'solid' } } }, product_modal: { slots: { close: { size: 'lg', color: 'primary', appearance: 'solid' } } } })
    const { unmount } = render(<Demo theme={theme} content={{ closeGroup: 'product_modal' }} />)
    await open()
    expect(buttonVarsOf(closeButton())).toEqual(componentVars(theme, 'button', slot('lg', 'primary', 'solid')))
    unmount()
    render(<Demo theme={theme} />)
    await open()
    expect(buttonVarsOf(closeButton())).toEqual(componentVars(theme, 'button', slot('xs', 'danger', 'solid')))
  })

  it('showCloseButton={false} leaves no room, whatever the group', async () => {
    render(<Demo content={{ closeGroup: 'product_modal', showCloseButton: false }} />)
    expect(portalOf((await open()).dialog).style.getPropertyValue('--ui-dialog-close-room')).toBe('')
  })
})

describe('Dialog: the band the close owns', () => {
  const bodyOf = (dialog) => dialog.querySelector(':scope > div:not([data-slot=band-edge])')

  it('sets the band from the popup top to the close bottom, and marks the body once it has scrolled', async () => {
    render(<Demo />)
    const { dialog } = await open()
    const slot = componentVars(defaults, 'button', closeButtonProps(defaults))
    expect(portalOf(dialog).style.getPropertyValue('--ui-dialog-close-zone')).toBe(`calc(var(--ui-modal-padding) + ${slot['--ui-button-height']})`)
    const body = bodyOf(dialog)
    expect(body.hasAttribute('data-scrolled')).toBe(false)
    body.scrollTop = 12
    fireEvent.scroll(body)
    expect(body.hasAttribute('data-scrolled')).toBe(true)
    body.scrollTop = 0
    fireEvent.scroll(body)
    expect(body.hasAttribute('data-scrolled')).toBe(false)
  })

  it('has no band without a close button', async () => {
    render(<Demo content={{ showCloseButton: false }} />)
    expect(portalOf((await open()).dialog).style.getPropertyValue('--ui-dialog-close-zone')).toBe('')
  })
})

describe('Dialog: a dialog over another', () => {
  const Stack = ({ phone }) => {
    const [over, setOver] = React.useState(false)
    return (
      <ThemeProvider theme={defaults}>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Saved addresses</DialogTitle>
            <button type='button' onClick={() => setOver(true)}>Edit address</button>
            <Dialog open={over} onOpenChange={setOver}>
              <DialogContent phone={phone}><DialogTitle>What&apos;s your address?</DialogTitle></DialogContent>
            </Dialog>
          </DialogContent>
        </Dialog>
      </ThemeProvider>
    )
  }
  const below = () => screen.getByRole('dialog', { hidden: true, name: 'Saved addresses' })

  it('a form over its list covers it: the list is hidden and out of reach, not left beside the form', async () => {
    render(<Stack />)
    await waitFor(() => expect(below()).toBeInTheDocument())
    expect(below().hasAttribute('data-covered')).toBe(false)
    fireEvent.click(screen.getByText('Edit address'))
    await waitFor(() => expect(below().hasAttribute('data-covered')).toBe(true))
    expect(below().className).toContain('ui:data-covered:opacity-0')
    expect(below().className).toContain('ui:data-covered:pointer-events-none')
  })

  it('an alert or a confirmation (center) is a card over its dialog, which stays', async () => {
    render(<Stack phone='center' />)
    await waitFor(() => expect(below()).toBeInTheDocument())
    fireEvent.click(screen.getByText('Edit address'))
    await screen.findByRole('dialog', { name: 'What\'s your address?' })
    expect(below().hasAttribute('data-covered')).toBe(false)
  })
})

describe('Dialog: sibling layers', () => {
  const Two = () => (
    <ThemeProvider theme={defaults}>
      <Dialog defaultOpen><DialogContent><DialogTitle>First</DialogTitle><input aria-label='First field' /></DialogContent></Dialog>
      <Dialog defaultOpen><DialogContent><DialogTitle>Second</DialogTitle><input aria-label='Second field' /></DialogContent></Dialog>
    </ThemeProvider>
  )

  it('two dialogs opened in the same render: the second stays operative, the first is inert, not both', async () => {
    render(<Two />)
    const [first, second] = await screen.findAllByRole('dialog', { hidden: true })
    expect(portalOf(second).hasAttribute('inert')).toBe(false)
    expect(second.closest('[inert]')).toBeNull()
    expect(portalOf(first).hasAttribute('inert')).toBe(true)
  })
  it('Escape closes one layer at a time, the one in front', async () => {
    render(<Two />)
    await screen.findAllByRole('dialog', { hidden: true })
    const field = screen.getByLabelText('Second field')
    field.focus()
    fireEvent.keyDown(field, { key: 'Escape' })
    await waitFor(() => expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(1))
    expect(screen.getByText('First')).toBeTruthy()
  })
})
