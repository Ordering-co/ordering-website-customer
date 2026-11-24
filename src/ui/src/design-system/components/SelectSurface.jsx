import React from 'react'
import { useTheme } from 'styled-components'
import { usePopper } from 'react-popper'
import { MOBILE_WEB_MAX_WIDTH, hasOwnFocusBorder } from '~/utils/themeCss'
import { menuPath } from '~/utils/siteSettings'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { LazySheet } from '~ui/src/components/Overlay/lazyOverlay'
import { maxHeightModifiers, OPTIONS_OFFSET, SELECT_OPTION_MIN_WIDTH } from '~ui/src/utils/selectPlacement'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { fieldBorderDeltas } from './field-spacing'
import { inputVariants } from './Input'
import { MENU_SCROLLBAR, menuScrollbarVars } from './menuScrollbar'

const modifiers = [{ name: 'offset', options: { offset: [0, OPTIONS_OFFSET] } }, ...maxHeightModifiers]

const TARGET = [
  'ui:after:absolute ui:after:left-1/2 ui:after:top-1/2 ui:after:size-full ui:after:-translate-x-1/2 ui:after:-translate-y-1/2',
  /* touch-target */ 'ui:max-mobile:after:min-h-[44px] ui:max-mobile:after:min-w-[44px]',
  /* touch-target */ 'ui:pointer-coarse:after:min-h-[44px] ui:pointer-coarse:after:min-w-[44px]'
]
const ITEM = [
  'ui:min-w-(--ui-select-option-min-width)',
  'ui:flex ui:items-center ui:min-h-(--ui-menu-item-height) ui:px-(--ui-menu-padding-x) ui:cursor-pointer ui:whitespace-nowrap ui:text-start ui:text-text',
  'ui:font-(family-name:--ui-menu-item-text-family) ui:text-(length:--ui-menu-item-text-size) ui:leading-(--ui-menu-item-text-line) ui:font-(weight:--ui-menu-item-text-weight)',
  'ui:motion-safe:transition-colors ui:motion-safe:duration-(--ui-menu-motion-duration) ui:motion-safe:ease-(--ui-menu-motion-easing)',
  'ui:[letter-spacing:var(--ui-menu-item-text-letter-spacing,normal)] ui:[text-transform:var(--ui-menu-item-text-transform,none)]',
  'ui:aria-disabled:cursor-not-allowed ui:aria-disabled:text-text-disabled'
]

const ITEM_PAINT = 'ui:hover:bg-(--ui-menu-item-hover) ui:aria-selected:bg-(--ui-menu-item-selected) ui:aria-selected:hover:bg-(--ui-menu-item-selected)'
const TOUCH_ITEM = [
  /* touch-target */ 'ui:max-mobile:min-h-[44px] ui:pointer-coarse:min-h-[44px]',
  'ui:relative ui:isolate ui:before:absolute ui:before:start-none ui:before:end-none ui:before:top-1/2 ui:before:h-(--ui-menu-item-height) ui:before:-translate-y-1/2 ui:before:-z-1',
  'ui:motion-safe:before:transition-colors ui:motion-safe:before:duration-(--ui-menu-motion-duration) ui:motion-safe:before:ease-(--ui-menu-motion-easing)',
  'ui:hover:before:bg-(--ui-menu-item-hover) ui:aria-selected:before:bg-(--ui-menu-item-selected) ui:aria-selected:hover:before:bg-(--ui-menu-item-selected)'
]

const MENU = [
  'ui:box-border ui:overflow-y-auto ui:rounded-(--ui-menu-radius)',
  'ui:bg-(--ui-menu-background) ui:[border:var(--ui-menu-border,none)] ui:[box-shadow:var(--ui-menu-shadow,none)]'
]

const PROFESSIONAL_MENU = [
  'ui:absolute ui:start-none ui:top-full ui:z-10 ui:mt-xs ui:w-full ui:py-xs',
  // a scrolling list: a share of the screen's height (about 263 px on a phone and on a desktop screen)
  'ui:max-h-[30dvh]'
]
const PROFESSIONAL_TRIGGER = [
  'ui:w-full ui:py-md ui:px-lg ui:text-inherit ui:[font:inherit] ui:whitespace-normal ui:outline-none ui:cursor-pointer',
  'ui:bg-(--ui-input-background) ui:rounded-(--ui-input-radius) ui:[box-shadow:var(--ui-input-shadow)]',
  'ui:enabled:not-focus:hover:bg-[color:var(--ui-input-hover-background,var(--ui-input-background))]',
  'ui:enabled:not-focus:hover:[box-shadow:var(--ui-input-hover-shadow,var(--ui-input-shadow))]'
]
const PROFESSIONAL_BORDER = {
  all: [
    'ui:[border:var(--ui-input-border)]',
    'ui:enabled:not-focus:hover:[border:var(--ui-input-hover-border,var(--ui-input-border))]',
    'ui:not-aria-invalid:focus:[border:var(--ui-input-focus-border,var(--ui-input-border))] ui:aria-invalid:[border:var(--ui-input-error-border,var(--ui-input-border))]'
  ],
  bottom: [
    'ui:rounded-b-none ui:[border-top:none] ui:[border-inline:none] ui:[border-bottom:var(--ui-input-border)]',
    'ui:enabled:not-focus:hover:[border-bottom:var(--ui-input-hover-border,var(--ui-input-border))]',
    'ui:not-aria-invalid:focus:[border-bottom:var(--ui-input-focus-border,var(--ui-input-border))] ui:aria-invalid:[border-bottom:var(--ui-input-error-border,var(--ui-input-border))]'
  ]
}

const focusOption = (list) => {
  const items = Array.from(list?.querySelectorAll('[role=option]:not([aria-disabled=true])') ?? [])
  return items.find((node) => node.getAttribute('aria-selected') === 'true') ?? items[0]
}

// The responsive select uses the same native button for both surfaces, so its
// ref and focus stay stable when the options move into a sheet.
export const SelectSurface = ({
  presentation, options, value, defaultValue, onChange, placeholder, valueContent, disabled, readOnly, openSingle, fullWidth, className,
  open: controlledOpen, onOpenChange, keepOpenOnTriggerClick, resetOnOptionsChange = true, plainOptions, onCover, listBorderBox, invalid, style, ...trigger
}) => {
  const theme = useTheme()
  const { width } = useWindowSize()
  // the menu's home is where the options sit on the surface color; with a full website it is /order
  const useSurfaceColor = plainOptions || (typeof window !== 'undefined' && ['/', '/home', menuPath(theme)].includes(window.location.pathname))
  const professional = presentation === 'anchored-professional'
  const fills = professional || fullWidth
  const asSheet = !professional && width < MOBILE_WEB_MAX_WIDTH
  const [valueState, setValue] = React.useState(defaultValue)
  const [openState, setOpenState] = React.useState(false)
  const [anchor, setAnchor] = React.useState(null)
  const [popup, setPopup] = React.useState(null)
  const triggerRef = React.useRef(null)
  const sheetList = React.useRef(null)
  const keyboardOpen = React.useRef(false)
  const ownedFocus = React.useRef(false)
  const listId = React.useId()
  const valueId = React.useId()
  const current = value === undefined ? valueState : value
  const requestedOpen = controlledOpen ?? openState
  const blocked = disabled || readOnly
  const open = requestedOpen && !blocked
  const single = !professional && options.length === 1 && !openSingle
  const Trigger = single ? 'div' : 'button'
  const selected = options.find(option => option.value === current)
  const selectedContent = single ? options[0].content : valueContent ?? selected?.showOnSelected ?? selected?.content
  const fieldLabel = trigger['aria-label'] ?? placeholder
  const invalidField = invalid || trigger['aria-invalid']
  const hasErrorBorder = invalidField === true || invalidField === 'true'
  const staticError = single && hasErrorBorder
  const describeValue = (!single || staticError) && selectedContent != null && (fieldLabel || trigger['aria-labelledby'])
  const labelWithValue = staticError && !fieldLabel && !trigger['aria-labelledby']
  const description = [trigger['aria-describedby'], describeValue ? valueId : null].filter(Boolean).join(' ') || undefined
  const menu = componentVars(theme, 'menu')
  const input = componentVars(theme, 'input', { variant: 'default', radius: 'md' })
  const bottom = input['--ui-input-border-sides'] === 'bottom'
  const sides = bottom ? 'bottom' : 'all'
  const openBorder = input['--ui-input-focus-border'] ?? input['--ui-input-border']
  const inlineBorder = bottom || openBorder === 'none' ? '0' : openBorder?.split(' ')[0] ?? '0'
  const ownFocus = hasOwnFocusBorder(input['--ui-input-border'], input['--ui-input-focus-border'])
  const { styles, attributes } = usePopper(anchor, asSheet || professional ? null : popup, {
    placement: theme?.rtl ? 'bottom-start' : 'bottom-end',
    modifiers
  })

  React.useEffect(() => {
    if (resetOnOptionsChange) setValue(defaultValue)
  }, [defaultValue, options, resetOnOptionsChange])

  const changeOpen = React.useCallback((next) => {
    if (!next) {
      ownedFocus.current = false
      keyboardOpen.current = false
    }
    setOpenState(next)
    onOpenChange?.(next)
  }, [onOpenChange])

  React.useLayoutEffect(() => {
    if (!open || asSheet || !anchor) return
    const doc = anchor.ownerDocument
    const recordFocus = (target) => { ownedFocus.current = anchor.contains(target) }
    const onFocus = (event) => recordFocus(event.target)
    recordFocus(doc.activeElement)
    doc.addEventListener('focusin', onFocus)
    return () => doc.removeEventListener('focusin', onFocus)
  }, [anchor, asSheet, open])

  React.useLayoutEffect(() => {
    if (!blocked || !requestedOpen) return
    const doc = anchor?.ownerDocument
    const active = doc?.activeElement
    // Disabling the focused button can already have blurred it to the body.
    const restore = anchor?.contains(active) || (ownedFocus.current && active === doc?.body)
    changeOpen(false)
    if (!asSheet && restore) {
      const target = disabled ? anchor : triggerRef.current
      target?.focus({ preventScroll: true })
    }
  }, [anchor, asSheet, blocked, changeOpen, disabled, requestedOpen])

  React.useEffect(() => {
    if (!open || asSheet) return
    if (keyboardOpen.current) focusOption(popup)?.focus({ preventScroll: true })
    const dismiss = (event) => {
      if (!anchor?.contains(event.target) && !popup?.contains(event.target)) changeOpen(false)
    }
    document.addEventListener('click', dismiss)
    return () => document.removeEventListener('click', dismiss)
  }, [open, asSheet, anchor, popup, changeOpen])

  const close = (returnFocus = false) => {
    changeOpen(false)
    if (returnFocus && !asSheet) triggerRef.current?.focus({ preventScroll: true })
  }

  const choose = (option) => {
    if (blocked || option.disabled) return
    if (option.value !== current) {
      setValue(option.value)
      onChange?.(option.value)
    }
    close(true)
  }

  const list = (ref, style, attrs) => (
    <div
      {...attrs}
      ref={ref}
      id={listId}
      role='listbox'
      aria-label={fieldLabel}
      data-slot='select-list'
      className={!asSheet
        ? cn(MENU,
          professional
            ? PROFESSIONAL_MENU
            : [
                'ui:absolute ui:z-10002 ui:overscroll-contain',
                !listBorderBox && 'ui:box-content',
                MENU_SCROLLBAR,
                fullWidth && 'ui:w-[calc(100%-var(--ui-select-inline-border)-var(--ui-select-inline-border))]'
              ]
        )
        : undefined}
      style={{
        ...menu,
        ...menuScrollbarVars(theme, menu['--ui-menu-radius']),
        '--ui-select-inline-border': inlineBorder,
        '--ui-select-option-min-width': SELECT_OPTION_MIN_WIDTH,
        ...style
      }}
      onClick={asSheet ? (event) => event.stopPropagation() : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          close(true)
        } else if (event.key === 'Tab' && !asSheet && !professional) {
          close()
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const items = Array.from(event.currentTarget.querySelectorAll('[role=option]:not([aria-disabled=true])'))
          const index = items.indexOf(event.target)
          const step = event.key === 'ArrowDown' ? 1 : -1
          items[(index + step + items.length) % items.length]?.focus()
        }
      }}
    >
      {options.map((option, index) => (
        <div
          key={index}
          data-slot='select-item'
          role='option'
          tabIndex={professional ? 0 : -1}
          aria-selected={option.value === current}
          aria-disabled={blocked || option.disabled || undefined}
          className={cn(ITEM,
            professional
              ? [ITEM_PAINT, 'ui:min-w-[0] ui:py-sm ui:whitespace-normal ui:text-inherit']
              : TOUCH_ITEM,
            !professional && useSurfaceColor && !asSheet && 'ui:bg-surface!'
          )}
          onClick={() => choose(option)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              choose(option)
            }
          }}
        >
          {option.content}
        </div>
      ))}
    </div>
  )

  return (
    <div ref={setAnchor} tabIndex={-1} className={cn('ui:relative ui:inline-block', fills && 'ui:w-full')}>
      <Trigger
        {...(!single && { type: 'button', disabled })}
        {...trigger}
        ref={triggerRef}
        role={staticError ? 'group' : trigger.role}
        aria-label={single && !staticError ? undefined : fieldLabel}
        aria-labelledby={labelWithValue ? valueId : trigger['aria-labelledby']}
        aria-describedby={description}
        aria-invalid={invalidField || undefined}
        aria-disabled={!single && readOnly ? true : trigger['aria-disabled']}
        aria-haspopup={single || readOnly ? undefined : 'listbox'}
        aria-expanded={single || readOnly ? undefined : open}
        aria-controls={!single && open ? listId : undefined}
        data-slot='select-trigger'
        data-field-padding={professional ? undefined : 'select'}
        data-field-border={professional ? undefined : sides}
        data-own-focus={!professional && ownFocus ? '' : undefined}
        data-popup-open={open ? '' : undefined}
        style={{ ...input, ...(!professional && fieldBorderDeltas(input)), ...style }}
        className={cn(
          professional
            ? [PROFESSIONAL_TRIGGER, PROFESSIONAL_BORDER[sides], ownFocus && 'ui:not-aria-invalid:focus-visible:outline-none!']
            : inputVariants({ sides, ownFocus }),
          'ui:relative ui:inline-flex ui:items-center ui:justify-between ui:text-start ui:[transform:none]',
          !professional && 'ui:whitespace-nowrap ui:[letter-spacing:var(--ui-input-text-letter-spacing,normal)] ui:[text-transform:var(--ui-input-text-transform,none)]',
          'ui:read-only:cursor-pointer ui:disabled:cursor-not-allowed',
          fills ? 'ui:w-full' : 'ui:w-auto',
          !professional && !hasErrorBorder && open && (bottom
            ? 'ui:[border-bottom:var(--ui-input-focus-border,var(--ui-input-border))]!'
            : 'ui:[border:var(--ui-input-focus-border,var(--ui-input-border))]!'),
          !single && !readOnly && TARGET,
          readOnly && 'ui:cursor-default!',
          onCover && 'ui:text-on-overlay!',
          className
        )}
        onClick={(event) => {
          if (single || blocked) return
          keyboardOpen.current = event.detail === 0
          changeOpen(keepOpenOnTriggerClick || !open)
        }}
        onKeyDown={(event) => {
          if (single || blocked) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            keyboardOpen.current = true
            changeOpen(!professional || !open)
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            keyboardOpen.current = true
            if (open && !asSheet) focusOption(popup)?.focus({ preventScroll: true })
            changeOpen(true)
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            close(true)
          }
        }}
      >
        <span id={describeValue || labelWithValue ? valueId : undefined} className={cn('ui:flex-1', professional && selectedContent == null && 'ui:leading-(--ui-input-height)')}>
          {selectedContent ?? placeholder}
        </span>
        {!single && !blocked && <ChevronIcon kind='list' open={open} />}
      </Trigger>
      {!single && (asSheet
        ? (
          <LazySheet
            open={open}
            onClose={() => close()}
            initialFocus={() => focusOption(sheetList.current) ?? true}
            finalFocus={() => triggerRef.current?.disabled ? anchor : triggerRef.current}
            aria-label={fieldLabel}
          >
            {list(sheetList)}
          </LazySheet>
          )
        : open && (professional ? list(setPopup) : list(setPopup, styles.popper, attributes.popper)))}
    </div>
  )
}
