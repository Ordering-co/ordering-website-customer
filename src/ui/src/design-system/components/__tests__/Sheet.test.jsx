import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { buildAppTheme } from '~/utils/appTheme'
import { getThemeCss } from '~/utils/themeCss'
import { themeSpace } from '~/utils/themeTokens'
import { componentVars } from '../../lib/componentVars'
import { THEMES } from '../../preview/themes'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../Dialog'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '../Sheet'

const [defaults, , cafe] = THEMES.map(({ theme }) => theme)

const Demo = ({ theme = defaults, side, size, content }) => (
  <ThemeProvider theme={theme}>
    <Sheet>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent side={side} size={size} {...content}>
        <SheetHeader>
          <SheetTitle>Choose a time</SheetTitle>
          <SheetDescription>When do you want it?</SheetDescription>
        </SheetHeader>
        <SheetFooter><SheetClose>Done</SheetClose></SheetFooter>
      </SheetContent>
    </Sheet>
  </ThemeProvider>
)

const open = async () => {
  const trigger = screen.getByText('Open')
  trigger.focus()
  fireEvent.click(trigger)
  return { trigger, dialog: await screen.findByRole('dialog') }
}
const portalOf = (el) => el.closest('[data-base-ui-portal]')

// jsdom has no layout: give the popup a size (a swipe closes past half of it) and let the
// point under a pointer be the element the test says (Base UI asks the document for it).
const SIZE = 400
// (and jsdom has no PointerEvent: a mouse event that carries the pointer's fields)
class FakePointerEvent extends MouseEvent {
  constructor (type, init = {}) {
    super(type, init)
    this.pointerType = init.pointerType
    this.pointerId = init.pointerId
  }
}
const layout = (target) => {
  vi.stubGlobal('PointerEvent', FakePointerEvent)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(SIZE)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(SIZE)
  document.elementFromPoint = () => target
}
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete document.elementFromPoint
})
// A mouse drag along one axis, in two moves, released after `wait` ms (event times are the page's clock,
// the only fake one: past half of the size or faster than half a pixel a millisecond closes it).
const drag = (target, from, to, wait = 500) => {
  const at = ([x, y], buttons = 1) => ({ clientX: x, clientY: y, button: 0, buttons, pointerType: 'mouse', pointerId: 1, isPrimary: true })
  vi.useFakeTimers({ toFake: ['performance', 'Date'] })
  fireEvent.pointerDown(target, at(from))
  // (Base UI takes the first move as the drag's origin, to absorb the gap between the press and it)
  fireEvent.pointerMove(target, at(from))
  fireEvent.pointerMove(target, at([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]))
  vi.advanceTimersByTime(wait)
  fireEvent.pointerMove(target, at(to))
  fireEvent.pointerUp(target, at(to, 0))
  vi.useRealTimers()
}

describe('Sheet', () => {
  it('is a labelled dialog that opens from the bottom by default and closes with Escape, giving the focus back', async () => {
    render(<Demo />)
    const { trigger, dialog } = await open()
    expect(dialog).toHaveAccessibleName('Choose a time')
    expect(dialog).toHaveAccessibleDescription('When do you want it?')
    expect(dialog.getAttribute('data-side')).toBe('bottom')
    expect(dialog.className).toContain('ui:data-starting-style:translate-y-full')
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('has a close button named Close, and the done action closes it', async () => {
    render(<Demo />)
    await open()
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close).toBeInTheDocument()
    // its variables are its own, none on the portal (the Buttons of the sheet would inherit them)
    expect(close.style.getPropertyValue('--ui-button-height')).not.toBe('')
    expect(portalOf(close).style.getPropertyValue('--ui-button-height')).toBe('')
    expect(portalOf(close).style.getPropertyValue('--ui-dialog-close-room')).toMatch(/^calc\(/)
    fireEvent.click(screen.getByText('Done'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('slides in from its side: the physical one, also in a right-to-left language', async () => {
    const { unmount } = render(<Demo side='right' />)
    const right = (await open()).dialog
    expect(right.className).toContain('ui:data-starting-style:translate-x-full')
    // the anchoring is the popup's physical margin: `justify-end` and `justify-start` follow the direction
    expect(right.className).toContain('ui:ml-auto')
    expect(right.parentElement.className).not.toMatch(/ui:justify-(end|start)/)
    unmount()
    render(<Demo side='left' />)
    const left = (await open()).dialog
    expect(left.className).toContain('ui:data-starting-style:-translate-x-full')
    expect(left.className).toContain('ui:mr-auto')
    expect(left.parentElement.className).not.toMatch(/ui:justify-(end|start)/)
  })

  it('reads components.modal from the theme on its portalized element, over a layer above the dialog\'s', async () => {
    render(<Demo theme={cafe} size='lg' />)
    const { dialog } = await open()
    const portal = portalOf(dialog)
    const view = getThemeCss(cafe, 'modal')
    expect(portal.style.getPropertyValue('--ui-modal-width')).toBe(view.sizes.lg.width)
    expect(portal.style.getPropertyValue('--ui-modal-overlay')).toBe(view.base.overlay)
    expect(portal.style.getPropertyValue('--ui-modal-background')).toBe(view.base.background)
    expect(document.querySelector('[data-slot=dialog-overlay]').className).toContain('ui:z-20601')
    expect(dialog.parentElement.className).toContain('ui:z-20601')
  })

  it('`layer` puts it on the sheet\'s layer (the default) or on the dialog\'s, in the overlay and in the viewport', async () => {
    const layerOf = async (content) => {
      const { unmount } = render(<Demo content={content} />)
      const { dialog } = await open()
      const z = [document.querySelector('[data-slot=dialog-overlay]'), dialog.parentElement].map((el) => el.className.match(/ui:z-\d+/g))
      unmount()
      return z
    }
    expect(await layerOf({})).toEqual([['ui:z-20601'], ['ui:z-20601']])
    expect(await layerOf({ layer: 'sheet' })).toEqual([['ui:z-20601'], ['ui:z-20601']])
    expect(await layerOf({ layer: 'dialog' })).toEqual([['ui:z-20002'], ['ui:z-20002']])
  })

  it('on the dialog\'s layer a Dialog opened from inside it is over the sheet, and Escape closes only that one', async () => {
    render(
      <ThemeProvider theme={defaults}>
        <Sheet defaultOpen>
          <SheetContent layer='dialog' side='right'>
            <Dialog>
              <DialogTrigger>Inner</DialogTrigger>
              <DialogContent><DialogTitle>Inside</DialogTitle></DialogContent>
            </Dialog>
          </SheetContent>
        </Sheet>
      </ThemeProvider>
    )
    const sheet = await screen.findByRole('dialog')
    fireEvent.click(screen.getByText('Inner'))
    const inner = await screen.findByRole('dialog', { name: 'Inside' })
    const sheetPortal = portalOf(sheet)
    const innerPortal = portalOf(inner)
    // the same z-index: the later one in the DOM is on top
    expect(sheetPortal.compareDocumentPosition(innerPortal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(sheet.parentElement.className).toContain('ui:z-20002')
    expect(inner.parentElement.className).toContain('ui:z-20002')
    fireEvent.keyDown(inner, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Inside' })).toBeNull())
    expect(sheet.isConnected).toBe(true)
  })

  it('the modal\'s shadow falls from the edge it sits on', async () => {
    const view = getThemeCss(defaults, 'modal')
    const shadowOf = async (side) => {
      const { unmount } = render(<Demo side={side} />)
      const value = portalOf((await open()).dialog).style.getPropertyValue('--ui-modal-shadow')
      unmount()
      return value
    }
    expect(await shadowOf('bottom')).toBe(view.base.shadow.up)
    expect(await shadowOf('right')).toBe(view.base.shadow.left)
    expect(await shadowOf('left')).toBe(view.base.shadow.right)
  })

  it('is not full screen on a phone: it keeps the modal\'s own radius, not the phone\'s square one', async () => {
    render(<Demo theme={{ ...cafe, platform: 'mobile_web' }} />)
    const portal = portalOf((await open()).dialog)
    expect(portal.style.getPropertyValue('--ui-modal-radius')).toBe(getThemeCss(cafe, 'modal').base.radius)
  })
})

describe('Sheet drag to dismiss', () => {
  const handleOf = (dialog) => dialog.querySelector('[data-slot=sheet-handle]')

  it('the body pads what the keyboard covers: the sheet keeps its size and the content scrolls above it', async () => {
    for (const side of ['bottom', 'right']) {
      const { unmount } = render(<Demo side={side} />)
      const { dialog } = await open()
      const body = [...dialog.children].find((el) => el.className.includes('ui:overflow-y-auto'))
      expect(body.className, side).toContain('var(--keyboard-inset,0px)')
      expect(dialog.parentElement.getAttribute('style'), 'the viewport is not resized').toBeNull()
      unmount()
    }
  })

  it('the body publishes its bottom padding as --layer-pad-bottom: the bottom sheet\'s, with the safe area, and the side sheet\'s', async () => {
    const bodyOf = (el) => [...el.children].find((child) => child.className.includes('ui:overflow-y-auto'))
    const { unmount } = render(<Demo />)
    const { dialog } = await open()
    const bottom = bodyOf(dialog).className
    // one declaration of the variable (the sheet's replaces the dialog's), the same padding its own pb uses
    expect(bottom.match(/--layer-pad-bottom:/g)).toHaveLength(1)
    expect(bottom).toContain('ui:[--layer-pad-bottom:max(var(--ui-modal-padding),env(safe-area-inset-bottom))]')
    expect(bottom).not.toMatch(/--layer-pad-bottom:[^\s]*keyboard-inset/)
    expect(bottom.match(/--layer-end-gap:0px/g)).toHaveLength(1)
    unmount()
    render(<Demo side='right' />)
    const side = bodyOf((await open()).dialog).className
    expect(side.match(/--layer-pad-bottom:/g)).toHaveLength(1)
    expect(side).toContain('ui:[--layer-pad-bottom:var(--ui-modal-padding)]')
    expect(side).toContain('ui:[--layer-end-gap:0px]')
  })

  it('a flush bottom sheet lets its content reach the top edge under the handle and opens higher', async () => {
    const { unmount } = render(<Demo />)
    let { dialog } = await open()
    const bodyOf = (el) => [...el.children].find((child) => child.className.includes('ui:overflow-y-auto'))
    expect(bodyOf(dialog).className).toContain('ui:pt-[max(var(--ui-modal-padding-top),var(--sheet-handle-target,0px))]')
    expect(dialog.parentElement.className).toContain('ui:pt-xxxl')
    unmount()
    render(<Demo content={{ flush: true }} />)
    ;({ dialog } = await open())
    expect(bodyOf(dialog).className).not.toContain('ui:pt-[max(')
    expect(dialog.parentElement.className).toContain('ui:pt-xl')
    expect(dialog.parentElement.className).not.toContain('ui:pt-xxxl')
    expect(dialog.querySelector('[data-slot=sheet-handle]')).not.toBeNull()
  })

  it('a bottom sheet has a decorative grab handle, 44px to reach with a thumb, coloured by the theme', async () => {
    render(<Demo />)
    const { dialog } = await open()
    const handle = handleOf(dialog)
    expect(handle).toHaveAttribute('aria-hidden', 'true')
    expect(handle.textContent).toBe('')
    expect(dialog.className).toContain('ui:max-mobile:[--sheet-handle-target:44px]')
    expect(dialog.className).toContain('ui:pointer-coarse:[--sheet-handle-target:44px]')
    expect(handle.className).toContain('ui:after:min-h-(--sheet-handle-target)')
    // the zone starts at the popup's top edge (it clips what sticks out above it) and goes down: not centered on the handle
    expect(handle.className).toContain('ui:after:top-none')
    // over a content that reaches the top edge (the product's gallery), not under it
    expect(handle.className).toContain('ui:z-10')
    expect(handle.className).not.toContain('after:top-1/2')
    expect(handle.className).not.toContain('after:-translate-y-1/2')
    expect(handle.className).toContain('ui:cursor-grab')
    expect(handle.firstChild.className).toContain('ui:bg-border-strong')
    expect(handle.firstChild.className).toContain('ui:rounded-full')
    // the handle is not in the dialog's accessible tree and takes no focus
    expect(handle.querySelector('button, [tabindex]')).toBeNull()
  })

  it('has no handle on a side sheet, and each sheet swipes toward its own edge', async () => {
    const edges = { bottom: 'down', right: 'right', left: 'left' }
    for (const [side, edge] of Object.entries(edges)) {
      const { unmount } = render(<Demo side={side} />)
      const { dialog } = await open()
      expect(dialog.getAttribute('data-swipe-direction')).toBe(edge)
      expect(handleOf(dialog) !== null).toBe(side === 'bottom')
      unmount()
    }
  })

  it('the close button stays, named, for the keyboard and reduced motion: on the right, at the handle\'s height on a bottom sheet', async () => {
    render(<Demo />)
    const { dialog } = await open()
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.className).toContain('ui:end-(--ui-modal-padding)')
    expect(close.className).toContain('ui:top-sm')
    expect(close.className).not.toContain('ui:top-(--ui-modal-padding)')
    fireEvent.click(close)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(dialog).not.toBeInTheDocument()
  })

  it('a side sheet keeps the close at its usual place', async () => {
    render(<Demo side='right' />)
    await open()
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('ui:top-(--ui-modal-padding)')
  })

  it('moves only with motion allowed: every transition is motion-safe, the drag is an inline transform', async () => {
    render(<Demo />)
    const { dialog } = await open()
    const motion = dialog.className.split(' ').filter((name) => /transition|duration|ease/.test(name))
    expect(motion.length).toBeGreaterThan(0)
    motion.forEach((name) => expect(name).toContain('ui:motion-safe:'))
    expect(dialog.className).toContain('ui:[transform:translateY(var(--drawer-swipe-movement-y))]')
    expect(document.querySelector('[data-slot=dialog-overlay]').className).toContain('ui:data-swiping:transition-none')
  })

  it('dragging the handle down past half of the sheet closes it, giving the focus back', async () => {
    render(<Demo />)
    const { trigger, dialog } = await open()
    const handle = handleOf(dialog)
    layout(handle)
    drag(handle, [100, 100], [100, 100 + SIZE * 0.6])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('a short, slow drag does not close it: it goes back to its place', async () => {
    render(<Demo />)
    const { dialog } = await open()
    const handle = handleOf(dialog)
    layout(handle)
    drag(handle, [100, 100], [100, 100 + SIZE * 0.2])
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(dialog.style.getPropertyValue('--drawer-swipe-movement-y')).toBe('0px')
    expect(dialog.style.transform).toBe('')
  })

  it('a drag up, toward the inside, does not close it', async () => {
    render(<Demo />)
    const { dialog } = await open()
    const handle = handleOf(dialog)
    layout(handle)
    drag(handle, [100, 300], [100, 100])
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByRole('dialog')).toBe(dialog)
  })

  it('follows the pointer with an inline transform while dragging, and the overlay lightens with it', async () => {
    render(<Demo />)
    const { dialog } = await open()
    const handle = handleOf(dialog)
    layout(handle)
    const at = (y, buttons = 1) => ({ clientX: 100, clientY: y, button: 0, buttons, pointerType: 'mouse', pointerId: 1 })
    fireEvent.pointerDown(handle, at(100))
    fireEvent.pointerMove(handle, at(100))
    fireEvent.pointerMove(handle, at(160))
    expect(dialog).toHaveAttribute('data-swiping')
    expect(dialog.style.transform).toContain('translate3d(0px,60px,0)')
    expect(dialog.style.transition).toBe('none')
    expect(document.querySelector('[data-slot=dialog-overlay]')).toHaveAttribute('data-swiping')
    fireEvent.pointerUp(handle, at(160, 0))
  })

  it('a scrolling content scrolls first: a finger dragging it down closes the sheet only from the top of its scroll', async () => {
    render(<Demo />)
    const { dialog } = await open()
    const body = dialog.querySelector('[data-drawer-content]')
    layout(body)
    body.style.overflowY = 'auto' // (jsdom does not load the classes' CSS, and Base UI reads the computed overflow)
    Object.defineProperty(body, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(body, 'clientHeight', { configurable: true, value: 300 })
    const touch = (y) => ({ cancelable: true, touches: [{ clientX: 100, clientY: y }], changedTouches: [{ clientX: 100, clientY: y }] })
    const swipe = (scrollTop) => {
      body.scrollTop = scrollTop
      fireEvent.touchStart(body, touch(100))
      fireEvent.touchMove(body, touch(100))
      fireEvent.touchMove(body, touch(180))
      const dragged = dialog.hasAttribute('data-swiping')
      fireEvent.touchEnd(body, { touches: [], changedTouches: [{ clientX: 100, clientY: 180 }] })
      return dragged
    }
    expect(swipe(50)).toBe(false)
    expect(swipe(0)).toBe(true)
  })

  it.each([['right', [100, 100], [100 + SIZE * 0.6, 100]], ['left', [300, 100], [300 - SIZE * 0.6, 100]]])(
    'a %s sheet closes when dragged toward its edge, and not toward the page',
    async (side, from, to) => {
      render(<Demo side={side} />)
      const { dialog } = await open()
      layout(dialog)
      drag(dialog, to, from)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(screen.getByRole('dialog')).toBe(dialog)
      drag(dialog, from, to)
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    }
  )
})

describe('Sheet: width', () => {
  const widthOf = (dialog) => portalOf(dialog).style.getPropertyValue('--ui-modal-width')

  it('without width, a side sheet has its size\'s width, as before', async () => {
    render(<Demo side='right' size='lg' theme={cafe} />)
    expect(widthOf((await open()).dialog)).toBe(getThemeCss(cafe, 'modal').sizes.lg.width)
  })

  it('a side sheet takes the caller\'s width over the size\'s: a number is px, a string is CSS', async () => {
    const { unmount } = render(<Demo side='right' content={{ width: 830 }} />)
    const right = (await open()).dialog
    expect(widthOf(right)).toBe('830px')
    expect(right.className).toContain('ui:w-(--ui-modal-width)')
    unmount()
    render(<Demo side='left' content={{ width: '80%' }} />)
    expect(widthOf((await open()).dialog)).toBe('80%')
  })

  it('a bottom sheet is as wide as the screen: width does not apply', async () => {
    render(<Demo content={{ width: 830 }} />)
    const { dialog } = await open()
    expect(widthOf(dialog)).toBe(getThemeCss(defaults, 'modal').sizes.sm.width)
    expect(dialog.className).toContain('ui:w-full')
  })
})

describe('Sheet: closeGroup', () => {
  const closeButton = () => screen.getByRole('button', { name: 'Close' })
  const buttonVarsOf = (el) => Object.fromEntries(Array.from({ length: el.style.length }, (_, i) => el.style.item(i)).filter((name) => name.startsWith('--ui-button-')).map((name) => [name, el.style.getPropertyValue(name)]))
  const slot = (size, color, appearance) => ({ size, color, appearance, shape: 'icon' })
  const theme = buildAppTheme(null, { version: 2, values: { components: { modal: { slots: { close: { size: 'xs' } } }, product_modal: { slots: { close: { size: 'lg', color: 'primary', appearance: 'outline' } } } } } })

  it('without closeGroup (or \'modal\') the close is the modal\'s slot, as before', async () => {
    const taken = async (content) => {
      const { unmount } = render(<Demo theme={theme} side='right' content={content} />)
      const { dialog } = await open()
      const snapshot = [portalOf(dialog).style.cssText, closeButton().style.cssText]
      unmount()
      return snapshot
    }
    const before = await taken(undefined)
    expect(await taken({ closeGroup: 'modal' })).toEqual(before)
    expect(before[1]).toContain(componentVars(theme, 'button', slot('xs', 'neutral', 'ghost'))['--ui-button-height'])
  })

  it('product_modal: the close is that group\'s slot, on a side and on a bottom sheet, and the title\'s room follows', async () => {
    const mine = componentVars(theme, 'button', slot('lg', 'primary', 'outline'))
    for (const side of ['right', 'bottom']) {
      const { unmount } = render(<Demo theme={theme} side={side} content={{ closeGroup: 'product_modal' }} />)
      const portal = portalOf((await open()).dialog)
      expect(buttonVarsOf(closeButton())).toEqual(mine)
      expect(buttonVarsOf(portal)).toEqual({})
      expect(portal.style.getPropertyValue('--ui-dialog-close-room')).toBe(`calc(${mine['--ui-button-height']} + ${themeSpace(theme, 'md')})`)
      unmount()
    }
  })
})
