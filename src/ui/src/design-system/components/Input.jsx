// Adapted from shadcn/ui base input (Base UI primitive + cva), commit
// 7c9eaba1c0a6404c990c144a654792e3313c650d. MIT notice and source hash:
// docs/third-party/shadcn-ui/provenance.json.
import React from 'react'
import { useTheme } from 'styled-components'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { hasOwnFocusBorder } from '~/utils/themeCss'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { Button } from './Button'
import { inputVariants } from './input-variants'
import { fieldBorderDeltas } from './field-spacing'
import '../styles.css'
import './field-spacing.css'

// the classes live in input-variants.js, where the entry reaches them without this piece
export { inputVariants }

// An icon beside the text, in the theme's field icon color and size
const SLOT = 'ui:absolute ui:inset-y-none ui:flex ui:items-center ui:text-(--ui-input-icon-color) ui:[&_svg]:size-(--ui-input-icon-size) ui:[&_svg]:shrink-0'

// A compact field keeps its painted height. On touch screens its associated
// label fills the text column, and the clear button owns the other column.
const SEARCH_GROUP = [
  'ui:grid ui:grid-cols-[minmax(0,1fr)_auto] ui:items-center',
  /* touch-target */ 'ui:max-mobile:min-h-[44px] ui:pointer-coarse:min-h-[44px]'
]
const SEARCH_ICON_SPACE = 'calc(var(--ot-space-md) + var(--ui-input-icon-size) + var(--ot-space-sm))'
const SEARCH_ICON_ROOM = {
  start: 'ui:ps-[calc(var(--ot-space-md)+var(--ui-input-icon-size)+var(--ot-space-sm))]',
  end: 'ui:pe-[calc(var(--ot-space-md)+var(--ui-input-icon-size)+var(--ot-space-sm))]'
}
// The approved search icon of the text-clear layout (Bootstrap Icons, MIT).
// Keep the existing path and avoid loading the legacy icon registry.
const TextualMagnifier = () => (
  <svg aria-hidden='true' focusable='false' fill='currentColor' viewBox='0 0 16 16'>
    <path d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0' />
  </svg>
)

// A plain field (the profile's and the address's) keeps its painted height and, with a coarse pointer or on a phone,
// its box answers in 44 px: the wrapper itself is that box (the field centered in it), a tap on it focuses the field,
// and, being in the layout, it keeps the next field's touch area apart from this one's when the theme paints a field
// lower than 44 px. Off touch the wrapper has no box (`contents`), so nothing moves.
const TOUCH_BOX = /* touch-target */ 'ui:max-mobile:flex ui:max-mobile:items-center ui:max-mobile:min-h-[44px] ui:pointer-coarse:flex ui:pointer-coarse:items-center ui:pointer-coarse:min-h-[44px]'
const TEXT_CLEAR_HIT = /* touch-target */ 'ui:relative ui:after:absolute ui:after:start-1/2 ui:after:top-1/2 ui:after:-translate-x-1/2 ui:rtl:after:translate-x-1/2 ui:after:-translate-y-1/2 ui:after:size-full ui:max-mobile:after:min-h-[44px] ui:max-mobile:after:min-w-[44px] ui:pointer-coarse:after:min-h-[44px] ui:pointer-coarse:after:min-w-[44px]'
// The controls of a wide suffix (a stepper): each in a slot of the field's action size (a margin of half what its own
// height lacks of it), so their touch areas never overlap and a control keeps its own box
const WIDE_SUFFIX = 'ui:items-center ui:end-(--ui-input-icon-gap) ui:[&>*]:mx-[calc((var(--ui-input-action-size)-var(--ui-input-action-height))/2)]'
const FIELD_HIT = 'ui:col-start-1 ui:row-start-1 ui:h-full ui:cursor-text'
const CLEAR_HIT = 'ui:z-1 ui:col-start-2 ui:row-start-1 ui:flex ui:items-center ui:justify-center ui:w-(--ui-input-action-size)'

/**
 * The theme's text field. Its look is `components.input` of the theme in scope
 * (a `ComponentScope` group's, in a portal too), through `componentVars`.
 *
 * - `variant='file-picker'`: a hidden native file input. Use the ref to
 *   open it from a named button, and listen for its native change event.
 * - `invalid`: `aria-invalid` and the theme's error border. Name the message
 *   with `aria-describedby` (the id of the text that says what is wrong), or
 *   put the field in a Base UI `Field`, which does both.
 * - `prefix` / `suffix`: an `Icon` (or a button of the icon's size) before or
 *   after the text, in the theme's field icon color and size. With either, the
 *   field sits in a wrapper: `className` and `style` then go to the wrapper
 *   (its layout), the rest and `ref` to the `<input>`. A prefix is decoration
 *   and passes the pointer through; a suffix may be a control.
 * - `suffixWide`: the suffix is several controls (a quantity stepper: two
 *   buttons and a number), not one icon. The field reserves the suffix's own
 *   width (measured, so it follows its content) and each control gets a slot of
 *   the field's action size (44 px on touch screens) around its own box.
 * - `component='search_bar'` reads the search field's theme. Its decorative
 *   suffix uses the field's icon settings. `clear` replaces it with a named
 *   Button ({ label, icon, onClick }) in its own touch area.
 * - `variant='search-bar'`: a search field with a decorative leading
 *   `prefix`, positioned with the theme's md edge and sm text gap.
 * - `variant='clear-textual'`: the search field with its Bootstrap magnifier at
 *   the end, replaced by a text action when `clear={{ label, onClick }}` is set.
 *   `clear.anchor='right'` keeps that action at the physical right in both directions
 *   and removes its resting offset on hover and press.
 * - `disabled` and `readOnly` are the native ones. The field is never under
 *   16 px on a phone.
 * - Anything else goes to the `<input>`; `className` wins over the piece's classes.
 */
export const Input = React.forwardRef(({ className, style, invalid, prefix, suffix, suffixWide, component = 'input', clear, id, variant, ...props }, ref) => {
  const theme = useTheme()
  const wide = !!suffix && !!suffixWide && !clear
  const [suffixWidth, setSuffixWidth] = React.useState(null)
  const observer = React.useRef(null)
  // keeps the field's room equal to the suffix's width while its content changes
  const measureSuffix = React.useCallback((node) => {
    observer.current?.disconnect()
    if (!node || typeof ResizeObserver === 'undefined') return
    observer.current = new ResizeObserver(([entry]) => setSuffixWidth(entry.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth))
    observer.current.observe(node)
  }, [])
  const searchBar = variant === 'search-bar'
  const textual = variant === 'clear-textual'
  const search = searchBar || textual || component === 'search_bar'
  const iconClear = clear && !textual
  const generatedId = React.useId()
  const field = React.useRef(null)
  const setField = React.useCallback((node) => {
    field.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])
  // a tap on the touch strip (the wrapper itself, never the field or a control in it) is a tap on the field
  const focusField = (event) => { if (event.target === event.currentTarget) field.current?.focus() }
  if (variant === 'file-picker') {
    return <input {...props} ref={ref} id={id} data-slot='input' type='file' hidden tabIndex={-1} className={className} style={style} />
  }
  const inputId = id ?? (search ? generatedId : undefined)
  const vars = componentVars(theme, search ? 'search_bar' : 'input', {
    variant: 'default',
    radius: 'md',
    inherits: search ? 'input' : undefined
  })
  const sides = vars['--ui-input-border-sides'] === 'bottom' ? 'bottom' : 'all'
  const trackBorder = searchBar || textual
  if (trackBorder) {
    Object.assign(vars, fieldBorderDeltas(vars), {
      '--ui-field-start-space': searchBar && prefix ? SEARCH_ICON_SPACE : undefined,
      '--ui-field-end-space': textual ? clear ? 'var(--ot-space-xxxl)' : SEARCH_ICON_SPACE : undefined
    })
  }
  const grouped = search || prefix || suffix
  if (iconClear || wide) vars['--ui-input-action-height'] = componentVars(theme, 'button', { size: 'xs', shape: 'icon', color: 'neutral', appearance: 'ghost' })['--ui-button-height']
  const focusBorder = vars['--ui-input-focus-border']
  const classes = inputVariants({
    sides,
    ownFocus: hasOwnFocusBorder(vars['--ui-input-border'], focusBorder),
    start: !!prefix && !searchBar,
    end: !!suffix && !clear && !wide,
    endWide: wide
  })
  const input = (
    <InputPrimitive
      ref={setField}
      data-slot='input'
      data-field-padding={trackBorder ? 'input' : undefined}
      data-field-border={trackBorder ? sides : undefined}
      id={inputId}
      aria-invalid={invalid || undefined}
      {...props}
      {...(!grouped && { style: { ...vars, ...style } })}
      className={cn(classes,
        vars['--ui-input-text-letter-spacing'] != null && 'ui:[letter-spacing:var(--ui-input-text-letter-spacing)]',
        vars['--ui-input-text-transform'] != null && 'ui:[text-transform:var(--ui-input-text-transform)]',
        !grouped && className, search && 'ui:relative ui:col-span-full ui:row-start-1',
        searchBar && prefix && SEARCH_ICON_ROOM.start,
        textual && (clear ? 'ui:pe-xxxl' : SEARCH_ICON_ROOM.end),
        iconClear && 'ui:pe-[calc(var(--ui-input-action-size)+var(--ui-input-icon-gap))]')}
    />
  )
  if (!grouped) return <span data-slot='input-touch' onClick={focusField} className={cn('ui:contents', TOUCH_BOX)}>{input}</span>
  return (
    <div data-slot='input-group' onClick={search ? undefined : focusField} style={{ ...vars, ...(wide && suffixWidth != null && { '--ui-input-suffix-width': `${suffixWidth}px` }), ...style }} className={cn('ui:relative ui:block ui:w-full ui:min-w-[0]', search ? SEARCH_GROUP : TOUCH_BOX, textual && clear && 'ui:grid-cols-[minmax(0,1fr)_var(--ot-space-xxxl)]', (iconClear || wide) && [
      'ui:[--ui-input-action-size:var(--ui-input-action-height)]',
      /* touch-target */ 'ui:max-mobile:[--ui-input-action-size:max(var(--ui-input-action-height),44px)]',
      /* touch-target */ 'ui:pointer-coarse:[--ui-input-action-size:max(var(--ui-input-action-height),44px)]'
    ], className)}>
      {search && <label htmlFor={inputId} aria-hidden='true' className={cn(FIELD_HIT, !clear && 'ui:col-span-full')} />}
      {prefix && (
        <span data-slot='input-prefix' aria-hidden='true' className={cn(SLOT, 'ui:pointer-events-none', searchBar ? 'ui:start-md' : 'ui:start-(--ui-input-padding-x)')}>
          {prefix}
        </span>
      )}
      {input}
      {textual && (clear
        ? (
          <span data-slot='input-suffix' className={cn(
            'ui:absolute ui:z-1 ui:top-[calc((100%-var(--ui-input-height))/2)] ui:py-sm ui:max-h-full ui:-translate-x-[30%] ui:rtl:translate-x-[30%]',
            clear.anchor === 'right' ? 'ui:right-none ui:hover:[translate:none] ui:active:[translate:none]' : 'ui:end-none'
          )}>
            <Button appearance='link' linkVariant='muted' type='button' className={TEXT_CLEAR_HIT} onClick={clear.onClick}>{clear.label}</Button>
          </span>
          )
        : <span data-slot='input-suffix' className={cn(SLOT, 'ui:end-md ui:pointer-events-none')}><TextualMagnifier /></span>)}
      {iconClear
        ? (
          <span data-slot='input-suffix' className={CLEAR_HIT}>
            <Button shape='icon' size='xs' color='neutral' appearance='ghost' aria-label={clear.label} onClick={clear.onClick}>{clear.icon}</Button>
          </span>
          )
        : !textual && suffix && <span data-slot='input-suffix' ref={wide ? measureSuffix : undefined} className={cn(SLOT, wide ? WIDE_SUFFIX : 'ui:end-(--ui-input-padding-x)', search && 'ui:pointer-events-none')}>{suffix}</span>}
    </div>
  )
})
Input.displayName = 'Input'
